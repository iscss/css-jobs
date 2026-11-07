#!/usr/bin/env bash
# Checks every web address in docs/SOURCES.md and prints the ones that do not
# answer 200, so the tables there can be kept honest.
#
#   ./scripts/check-source-links.sh            # about 250 addresses, 12 at a time
#
# A 403 usually means the site refuses automated requests, not that it is gone;
# 404 and "000" (no answer at all) are the ones to fix. It sends a browser-like
# user agent, so it tells you whether a person can open the page. The importer
# itself identifies as CSSJobsBot, which some sites treat differently: use a dry
# run ({"source": "<slug>", "dryRun": true}) to test that.
set -u
cd "$(dirname "$0")/.."

check() {
  code=$(curl -s -L -m 20 -o /dev/null -w "%{http_code}" \
    -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36" "$1" 2>/dev/null)
  echo "$code $1"
}
export -f check

grep -o 'https\?://[^) |`>"]*' docs/SOURCES.md | sed 's/[.,;]$//' | sort -u \
  | xargs -P 12 -I{} bash -c 'check "{}"' > "${TMPDIR:-/tmp}/source-links.$$"

total=$(wc -l < "${TMPDIR:-/tmp}/source-links.$$")
echo "Checked $total addresses"
awk '{print $1}' "${TMPDIR:-/tmp}/source-links.$$" | sort | uniq -c | sort -rn
echo
echo "Not 200:"
grep -v '^200' "${TMPDIR:-/tmp}/source-links.$$" | sort || true
rm -f "${TMPDIR:-/tmp}/source-links.$$"
