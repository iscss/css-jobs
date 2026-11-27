// Find out what a university's careers site runs on, and whether the importer can read it.
//
//   node scripts/discover-site.mjs https://jobs.example.edu/ [more addresses...]
//
// For each address it prints: the HTTP status and any redirect; the hiring systems it recognises in
// the page (Workday, Oracle, SuccessFactors, PeopleAdmin, SmartRecruiters, HR-Manager, CoreHR...);
// whether pages carry schema.org JobPosting markup; what robots.txt says (crawl delay, sitemaps,
// disallowed paths); how many job-looking addresses the sitemap lists; and the most common link
// shapes on the page, which is where a `link_pattern` for the html-jobs reader comes from.
// It reads public pages only, once each, and says who it is. A bot challenge (HTTP 202, 403,
// "Just a moment") is reported as blocked: ask the site's owner to allow CSSJobsBot instead of working around it.
const UA = 'CSSJobsBot/1.0 (+https://jobs.iscss.org; contact: admin@iscss.org)';
const PLATFORMS = {
  workday: /myworkdayjobs\.com|myworkdaysite\.com/i, oracle: /oraclecloud\.com/i,
  successfactors: /successfactors\.(?:com|eu)|jobs\.sap\.com|\/talentcommunity\/apply\//i,
  peopleadmin: /peopleadmin\.com|\/postings\/search/i, smartrecruiters: /smartrecruiters\.com/i,
  'hr-manager': /hr-manager\.net/i, corehr: /corehr\.com/i, taleo: /taleo\.net/i, icims: /icims\.com/i,
  interfolio: /interfolio\.com/i, 'academic-jobs-online': /academicjobsonline\.org/i, personio: /personio\.(?:de|com)/i,
  pageup: /pageuppeople\.com/i, eploy: /eploy\./i, 'jobs.ac.uk': /jobs\.ac\.uk/i, euraxess: /euraxess/i,
  'uc-recruit (AP Recruit)': /\/apply\b[\s\S]{0,200}JPF\d+|JPF\d{4,}/, helix: /helixjobs\.com/i, jobvite: /jobvite\.com/i,
  greenhouse: /greenhouse\.io/i, lever: /lever\.co/i,
};
const JOBISH = /(job|vacanc|career|stellen|position|posting|offre|recruit|werken|karriere|emploi|lavora)/i;
const get = async (url) => {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/xml' }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
    return { status: r.status, url: r.url, text: r.status === 200 ? await r.text() : '' };
  } catch (e) { return { status: 0, url, text: '', error: String(e).slice(0, 60) }; }
};
const template = (p) => p.replace(/\d+/g, '#').replace(/[A-Za-z0-9_-]{18,}/g, '*').split('/').slice(0, 4).join('/');

for (const input of process.argv.slice(2)) {
  const page = await get(input);
  console.log(`\n== ${input}`);
  console.log(`status ${page.status}${page.url !== input ? ` -> ${page.url}` : ''}${page.error ? ` (${page.error})` : ''}`);
  if ([202, 403, 429, 503].includes(page.status)) console.log('BLOCKED or challenged: ask the owner to allow CSSJobsBot (do not work around it)');
  if (/Just a moment|Attention Required|cf-challenge/i.test(page.text)) console.log('BLOCKED: a Cloudflare challenge page');
  const html = page.text;
  const found = Object.entries(PLATFORMS).filter(([, re]) => re.test(html)).map(([name]) => name);
  console.log('hiring systems seen in the page:', found.length ? found.join(', ') : 'none recognised');
  console.log('JobPosting markup on this page:', (html.match(/"@type"\s*:\s*"JobPosting"/g) || []).length);

  const origin = new URL(page.url || input).origin;
  const robots = await get(`${origin}/robots.txt`);
  // Only the rules that apply to us: the group for `*` or CSSJobsBot, not other bots' groups.
  let applies = false, sawRule = false;
  const mine = [];
  for (const raw of robots.text.split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    const [key, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    if (/^user-agent$/i.test(key)) {
      if (sawRule) { applies = false; sawRule = false; }
      applies ||= value === '*' || /cssjobsbot/i.test(value);
    } else if (key) {
      sawRule = true;
      if (applies) mine.push([key.toLowerCase(), value]);
    }
  }
  const delay = mine.find(([k]) => k === 'crawl-delay')?.[1];
  const disallow = mine.filter(([k]) => k === 'disallow').map(([, v]) => v).slice(0, 6);
  const maps = [...robots.text.matchAll(/^sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  console.log(`robots.txt: ${robots.status}${delay ? `, CRAWL-DELAY ${delay}s (set delay_ms ${Number(delay) * 1000})` : ''}${disallow.length ? `, disallows ${disallow.join(' ')}` : ''}`);
  for (const map of (maps.length ? maps : [`${origin}/sitemap.xml`]).slice(0, 3)) {
    const sm = await get(map);
    if (!/<(urlset|sitemapindex)/.test(sm.text)) { console.log(`sitemap ${map}: ${sm.status}, not readable`); continue; }
    const locs = [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const jobs = locs.filter((u) => JOBISH.test(u));
    console.log(`sitemap ${map}: ${locs.length} addresses, ${jobs.length} look like jobs${jobs[0] ? `, e.g. ${jobs[0]}` : ''}`);
  }

  const groups = {};
  for (const a of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let u; try { u = new URL(a[1].replace(/&amp;/g, '&'), page.url); } catch { continue; }
    if (!/^https?:$/.test(u.protocol)) continue;
    const text = a[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length < 12 || text.length > 160) continue;
    (groups[u.host + template(u.pathname)] ??= new Set()).add(`${u.href} | ${text.slice(0, 50)}`);
  }
  const top = Object.entries(groups).filter(([, v]) => v.size >= 4).sort((a, b) => b[1].size - a[1].size).slice(0, 4);
  console.log(top.length ? 'most common link shapes (a job list repeats one shape; use it for link_pattern):' : 'no repeated link shape: the list is probably built by script (look for a sitemap, or ask a person to find its data address in the browser network tab)');
  for (const [key, v] of top) console.log(`  ${v.size}x ${key}\n      e.g. ${[...v][0]}`);
}
