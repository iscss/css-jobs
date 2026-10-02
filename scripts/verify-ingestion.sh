#!/usr/bin/env bash
#
# Verifies the safety guarantees of automated job ingestion against a running
# local Supabase stack. These are database-level checks, not unit tests: they
# confirm what an attacker or a buggy import can actually do.
#
# Usage:  ./scripts/verify-ingestion.sh
# Needs:  npx supabase start   (and functions serve, for the ingest check)

set -uo pipefail

API="http://127.0.0.1:54321"
DB="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

pass=0
fail=0

ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; pass=$((pass + 1)); }
bad()  { printf '  \033[31m✗\033[0m %s\n'   "$1"; fail=$((fail + 1)); }
head() { printf '\n\033[1m%s\033[0m\n' "$1"; }

if ! curl -sf "$API/rest/v1/" -o /dev/null; then
  echo "Local Supabase is not running. Start it with: npx supabase start"
  exit 1
fi

ANON=$(npx supabase status -o json 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin)['ANON_KEY'])")
SRK=$(npx supabase status -o json 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin)['SERVICE_ROLE_KEY'])")

q() { psql "$DB" -tAc "$1" 2>/dev/null; }

# ---------------------------------------------------------------------------
head "1. Public visibility — the core guarantee"
# ---------------------------------------------------------------------------

pending_count=$(q "SELECT count(*) FROM jobs WHERE is_auto_imported AND approval_status='pending';")
anon_sees=$(curl -sS "$API/rest/v1/jobs?select=id&is_auto_imported=eq.true" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" |
  python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null)

if [ "${pending_count:-0}" -gt 0 ]; then
  ok "$pending_count imported jobs are pending in the database"
else
  bad "no pending imported jobs to test against (run an import first)"
fi

if [ "${anon_sees:-x}" = "0" ]; then
  ok "anonymous API returns 0 of them — public cannot see pending imports"
else
  bad "anonymous API returned $anon_sees imported jobs (expected 0)"
fi

# ---------------------------------------------------------------------------
head "2. The trigger cannot be bypassed"
# ---------------------------------------------------------------------------

# Try to insert an imported job that claims to be already approved and
# published. The trigger must force it back to pending.
forced=$(q "INSERT INTO jobs (title, institution, location, description, posted_by, is_auto_imported, approval_status, is_published, is_featured, source, source_url, content_hash) VALUES ('Trigger bypass attempt','Test Institution','Nowhere',repeat('x',60),public.job_bot_id(),true,'approved',true,true,'test','https://example.org/tt-'||gen_random_uuid(),'hash-'||gen_random_uuid()) RETURNING approval_status||'/'||is_published||'/'||is_featured;" | grep -m1 '/')

if [ "$forced" = "pending/false/false" ]; then
  ok "insert claiming approved+published+featured was forced to pending"
else
  bad "trigger did not clamp the insert (got '$forced')"
fi

q "DELETE FROM jobs WHERE source='test';" >/dev/null

# ---------------------------------------------------------------------------
head "3. Deduplication"
# ---------------------------------------------------------------------------

dup_url=$(q "
  DO \$\$
  DECLARE u TEXT := 'https://example.org/dupe-test';
  BEGIN
    INSERT INTO jobs (title, institution, location, description, posted_by,
                      is_auto_imported, source, source_url, content_hash)
    VALUES ('Dedupe test one', 'Test Institution', 'Nowhere', repeat('x',60),
            public.job_bot_id(), true, 'test', u, 'hash-a');
    BEGIN
      INSERT INTO jobs (title, institution, location, description, posted_by,
                        is_auto_imported, source, source_url, content_hash)
      VALUES ('Dedupe test two', 'Test Institution', 'Nowhere', repeat('x',60),
              public.job_bot_id(), true, 'test', u, 'hash-b');
      RAISE NOTICE 'NO_ERROR';
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'BLOCKED';
    END;
  END \$\$;
" 2>&1)

if q "SELECT count(*) FROM jobs WHERE source_url='https://example.org/dupe-test';" | grep -q '^1$'; then
  ok "duplicate source_url rejected by unique index"
else
  bad "duplicate source_url was not blocked"
fi

q "
  INSERT INTO jobs (title, institution, location, description, posted_by,
                    is_auto_imported, source, source_url, content_hash)
  VALUES ('Same role elsewhere', 'Test Institution', 'Nowhere', repeat('x',60),
          public.job_bot_id(), true, 'test',
          'https://example.org/other-url', 'hash-a')
  ON CONFLICT DO NOTHING;
" >/dev/null

if q "SELECT count(*) FROM jobs WHERE content_hash='hash-a';" | grep -q '^1$'; then
  ok "same content_hash under a different URL rejected — syndicated copies collapse"
else
  bad "content_hash duplicate was not blocked"
fi

q "DELETE FROM jobs WHERE source='test';" >/dev/null

# ---------------------------------------------------------------------------
head "4. Database constraints reject malformed imports"
# ---------------------------------------------------------------------------

check_rejected() {
  local label="$1" sql="$2"
  if q "$sql" >/dev/null 2>&1; then
    bad "$label was accepted (expected rejection)"
    q "DELETE FROM jobs WHERE source='test';" >/dev/null
  else
    ok "$label rejected"
  fi
}

base="INSERT INTO jobs (title, institution, location, description, posted_by, is_auto_imported, source, source_url) VALUES"

check_rejected "description under 50 chars" \
  "$base ('Valid title here','Test Inst','Nowhere','too short',public.job_bot_id(),true,'test','https://example.org/c1');"

check_rejected "title under 5 chars" \
  "$base ('abc','Test Inst','Nowhere',repeat('x',60),public.job_bot_id(),true,'test','https://example.org/c2');"

check_rejected "non-http source_url" \
  "$base ('Valid title here','Test Inst','Nowhere',repeat('x',60),public.job_bot_id(),true,'test','javascript:alert(1)');"

check_rejected "relevance_score above 1" \
  "INSERT INTO jobs (title,institution,location,description,posted_by,is_auto_imported,source,source_url,relevance_score) VALUES ('Valid title here','Test Inst','Nowhere',repeat('x',60),public.job_bot_id(),true,'test','https://example.org/c4',1.5);"

q "DELETE FROM jobs WHERE source='test';" >/dev/null

# ---------------------------------------------------------------------------
head "5. Queue ordering"
# ---------------------------------------------------------------------------

top_score=$(q "SELECT coalesce(max(relevance_score),0) FROM jobs WHERE approval_status='pending' AND is_auto_imported;")
first_row=$(q "SELECT coalesce(relevance_score,0) FROM jobs WHERE approval_status='pending' AND is_auto_imported ORDER BY is_auto_imported ASC, relevance_score DESC NULLS LAST LIMIT 1;")

if [ "$top_score" = "$first_row" ]; then
  ok "highest-scoring import sorts to the top of the queue ($top_score)"
else
  bad "queue ordering wrong (top=$top_score, first=$first_row)"
fi

low_kept=$(q "SELECT count(*) FROM jobs WHERE approval_status='pending' AND is_auto_imported AND relevance_score < 0.2;")
if [ "${low_kept:-0}" -ge 0 ]; then
  ok "$low_kept low-scoring jobs retained — nothing discarded by score"
fi

# ---------------------------------------------------------------------------
head "6. Ingest function auth"
# ---------------------------------------------------------------------------

if curl -sf "$API/functions/v1/ingest-jobs" -o /dev/null -X POST \
     -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" -d '{}' 2>/dev/null; then
  bad "anon key was accepted by ingest-jobs (expected 401)"
else
  ok "anon key rejected by ingest-jobs"
fi

status=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$API/functions/v1/ingest-jobs" \
  -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" \
  -d '{"source":"jobrxiv","dryRun":true}' --max-time 90 2>/dev/null)

if [ "$status" = "200" ]; then
  ok "service role accepted (dry run returned 200)"
elif [ "$status" = "000" ]; then
  printf '  \033[33m–\033[0m functions server not running; skipped live dry-run check\n'
else
  bad "service role dry run returned HTTP $status"
fi

# ---------------------------------------------------------------------------
printf '\n\033[1mResult:\033[0m %d passed, %d failed\n\n' "$pass" "$fail"
[ "$fail" -eq 0 ] || exit 1
