// Ask the link check what it thinks of some addresses. For every new source, test one real job
// address (expect "live") and one made-up job address on the same site (expect "dead" or
// "closed"). Many sites answer 200 for a removed job and only redirect or show a notice, and the
// link check hides or deletes jobs it calls dead, so this test matters.
//
//   npx tsx scripts/test-link-check.mts https://careers.example.edu/job/real/123 https://careers.example.edu/job/made-up/999999999
import { checkListing } from '../supabase/functions/_shared/liveness.ts';

const urls = process.argv.slice(2);
if (!urls.length) throw new Error('give one or more job addresses');
for (const url of urls) console.log(JSON.stringify(await checkListing(url)).padEnd(70), url);
