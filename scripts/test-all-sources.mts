// Run every active source through its real reader, the importer's own validation and the link
// check, against the live sites. Use it before and after any change to a reader, so a change
// made for one site cannot quietly break another.
//
//   python3 scripts/list-sources.py sources.json
//   npx tsx scripts/test-all-sources.mts sources.json                      # all active sources
//   npx tsx scripts/test-all-sources.mts sources.json --only wd-brown,sf-duke
//   npx tsx scripts/test-all-sources.mts sources.json --save before.json   # keep the result
//   npx tsx scripts/test-all-sources.mts sources.json --compare before.json  # show what changed
//
// Per source it prints: jobs fetched, how many passed the importer's validation, how many were
// stale or skipped, and whether up to three sample job links are still "live". It does not call
// the AI review or write to any database. It takes about 3 minutes for all sources (the
// readers pause between requests on purpose).
import { readFileSync, writeFileSync } from 'node:fs';
import { ADAPTERS } from '../supabase/functions/_shared/adapters.ts';
import { normalizeJob, SkippedJobError, StaleJobError } from '../supabase/functions/_shared/ingest.ts';
import { checkListing } from '../supabase/functions/_shared/liveness.ts';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--') && a.endsWith('.json'));
if (!file) throw new Error('usage: test-all-sources.mts sources.json [--only a,b] [--save out.json] [--compare old.json]');
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const only = flag('--only')?.split(',');
const sources = Object.values(JSON.parse(readFileSync(file, 'utf8'))) as any[];
const active = sources.filter((s) => s.is_active && (!only || only.includes(s.slug)));

interface Result {
  slug: string; adapter: string; fetched?: number; valid?: number; stale?: number; skipped?: number;
  other?: number; links?: string[]; error?: string; secs: number;
}
const results: Result[] = [];
let next = 0;

async function worker() {
  while (next < active.length) {
    const s = active[next++];
    const started = Date.now();
    const r: Result = { slug: s.slug, adapter: s.adapter, secs: 0 };
    try {
      const adapter = ADAPTERS[s.adapter];
      if (!adapter) throw new Error('unknown adapter');
      let timer: ReturnType<typeof setTimeout> | undefined;
      const jobs = await Promise.race([
        adapter(s.feed_url, s.config ?? {}),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('timeout after 280 s')), 280000);
        }),
      ]).finally(() => clearTimeout(timer));
      Object.assign(r, { fetched: jobs.length, valid: 0, stale: 0, skipped: 0, other: 0, links: [] });
      for (const job of jobs) {
        try {
          await normalizeJob(job, s.slug, 'test-bot', { maxAgeDays: s.max_age_days });
          r.valid!++;
        } catch (e) {
          if (e instanceof StaleJobError) r.stale!++;
          else if (e instanceof SkippedJobError) r.skipped!++;
          else r.other!++;
        }
      }
      for (const job of jobs.slice(0, 3)) {
        const check = await checkListing(job.sourceUrl);
        r.links!.push(check.status === 'live' ? 'live' : `${check.status}: ${check.reason}`);
      }
    } catch (e) {
      r.error = String(e).slice(0, 140);
    }
    r.secs = +((Date.now() - started) / 1000).toFixed(1);
    results.push(r);
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
results.sort((a, b) => a.slug.localeCompare(b.slug));

const compare = flag('--compare');
const before: Record<string, Result> = compare
  ? Object.fromEntries((JSON.parse(readFileSync(compare, 'utf8')) as Result[]).map((r) => [r.slug, r]))
  : {};
console.log(`${'source'.padEnd(36)}${'fetched'.padStart(8)}${'valid'.padStart(7)}${'stale'.padStart(7)}${'secs'.padStart(7)}  notes`);
for (const r of results) {
  const notes: string[] = [];
  if (r.error) notes.push(`ERROR ${r.error}`);
  const bad = (r.links ?? []).filter((l) => l !== 'live');
  if (bad.length) notes.push(`links: ${[...new Set(bad)].join(' | ')}`);
  if (r.fetched === 0) notes.push('no jobs');
  const old = before[r.slug];
  if (compare && old && old.fetched !== r.fetched) notes.push(`CHANGED from ${old.fetched ?? 'error'}`);
  if (compare && !old) notes.push('new since the saved run');
  console.log(`${r.slug.padEnd(36)}${String(r.fetched ?? '-').padStart(8)}${String(r.valid ?? '-').padStart(7)}${String(r.stale ?? '-').padStart(7)}${String(r.secs).padStart(7)}  ${notes.join('; ')}`);
}
const sum = (k: keyof Result) => results.reduce((t, r) => t + ((r[k] as number) ?? 0), 0);
console.log(`\n${results.length} sources | ${results.filter((r) => r.error).length} errors | fetched ${sum('fetched')} | valid ${sum('valid')} | stale ${sum('stale')} | skipped ${sum('skipped')} | other ${sum('other')}`);
const save = flag('--save');
if (save) writeFileSync(save, JSON.stringify(results, null, 1));
process.exit(0);
