// Source adapters: fetch a feed and return RawJob values.
//
// Adapters do no validation — normalizeJob in ingest.ts owns that. An adapter's
// only job is knowing the shape of one particular feed.

import { stripHtml, type RawJob } from './ingest.ts';

const USER_AGENT =
  'CSSJobsBot/1.0 (+https://jobs.iscss.org; contact: admin@iscss.org)';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function tag(xml: string, name: string): string | undefined {
  // Handles both <tag>value</tag> and <tag><![CDATA[value]]></tag>.
  const match = xml.match(
    new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'),
  );
  if (!match) return undefined;
  const value = match[1].trim();
  const cdata = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return (cdata ? cdata[1] : value).trim() || undefined;
}

function items(xml: string): string[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
}

async function fetchFeed(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml' },
  });

  if (!response.ok) {
    throw new Error(`feed returned HTTP ${response.status}`);
  }

  const body = await response.text();
  // Bot-protection pages return 200 with an HTML body; treat that as failure
  // rather than parsing zero items and reporting a misleading success.
  if (!/<rss|<feed|<item>/i.test(body)) {
    throw new Error('feed did not return RSS (possible bot protection)');
  }
  return body;
}

// jobRxiv exposes a WordPress job_feed with structured job_listing:* fields.
// posts_per_page is honoured; paged is not, so one large page is the way to
// pull a full batch.
export async function jobRxivAdapter(
  feedUrl: string,
  config: Record<string, unknown>,
): Promise<RawJob[]> {
  const perPage = Number(config.posts_per_page ?? 100);
  const url = new URL(feedUrl);
  url.searchParams.set('posts_per_page', String(perPage));

  const xml = await fetchFeed(url.toString());

  return items(xml).flatMap((item) => {
    const title = tag(item, 'title');
    const link = tag(item, 'link');
    if (!title || !link) return [];

    return [{
      title,
      institution:
        tag(item, 'job_listing:company') ?? tag(item, 'dc:creator') ?? '',
      location: tag(item, 'job_listing:location') ?? 'Not specified',
      description:
        tag(item, 'content:encoded') ?? tag(item, 'description') ?? '',
      jobType: tag(item, 'job_listing:job_type'),
      sourceUrl: link,
      sourceJobId: tag(item, 'guid') ?? link,
      postedAt: tag(item, 'pubDate'),
    }];
  });
}

// Generic RSS 2.0 adapter for the many university career pages that publish a
// plain feed. Institution falls back to the source's configured name.
export async function genericRssAdapter(
  feedUrl: string,
  config: Record<string, unknown>,
): Promise<RawJob[]> {
  const xml = await fetchFeed(feedUrl);
  const defaultInstitution = String(config.institution ?? '');
  const defaultLocation = String(config.location ?? 'Not specified');

  return items(xml).flatMap((item) => {
    const title = tag(item, 'title');
    const link = tag(item, 'link');
    if (!title || !link) return [];

    return [{
      title,
      institution: defaultInstitution,
      location: defaultLocation,
      description:
        tag(item, 'content:encoded') ?? tag(item, 'description') ?? '',
      sourceUrl: link,
      sourceJobId: tag(item, 'guid') ?? link,
      postedAt: tag(item, 'pubDate'),
    }];
  });
}

// CoMSES Net — the computational modelling and social simulation community.
// Far higher CSS density than general science boards, but the feed carries no
// structured company/location fields, so institution is recovered from the
// title and body text.
const INSTITUTION_PATTERNS: RegExp[] = [
  /\b(?:at|with|,)\s+(?:the\s+)?((?:University|Universit[àéi]t?|Universiteit|Universidad|Université)\s+(?:of\s+)?[A-Z][\w'’-]*(?:\s+[A-Z][\w'’-]*){0,3})/,
  /\b([A-Z][\w'’-]*(?:\s+[A-Z][\w'’-]*){0,3}\s+University)\b/,
  /\b((?:Max Planck|Santa Fe|Brookings|RAND)\s+[A-Z][\w'’-]*(?:\s+[A-Z][\w'’-]*){0,3})/,
  /\b([A-Z][\w'’-]*(?:\s+[A-Z][\w'’-]*){0,3}\s+(?:Institute|College|Laborator(?:y|ies)|Centre|Center))\b/,
];

function guessInstitution(title: string, description: string): string {
  for (const text of [title, description.slice(0, 1200)]) {
    for (const pattern of INSTITUTION_PATTERNS) {
      const hit = text.match(pattern);
      if (hit?.[1]) return hit[1].replace(/\s+/g, ' ').trim();
    }
  }
  return '';
}

export async function comsesAdapter(
  feedUrl: string,
  _config: Record<string, unknown>,
): Promise<RawJob[]> {
  const xml = await fetchFeed(feedUrl);

  return items(xml).flatMap((item) => {
    const title = tag(item, 'title');
    const link = tag(item, 'link');
    const description = tag(item, 'description') ?? '';
    if (!title || !link) return [];

    // dc:creator is the submitting user's account name (often a bare
    // username), not an institution — never use it. Fall back to the source
    // name so an admin can still read the original posting and fill it in.
    const institution = guessInstitution(title, description) || 'CoMSES Net';

    return [{
      title,
      institution,
      location: 'Not specified',
      description,
      sourceUrl: link,
      sourceJobId: tag(item, 'guid') ?? link,
      postedAt: tag(item, 'pubDate'),
    }];
  });
}

// Workday (CXS) — the platform behind most university career sites now that
// their RSS feeds are gone. Undocumented but public: no auth, JSON in and out.
//
// Two calls per job: a search page listing titles, then a per-job fetch for the
// description. Search runs server-side, so config.searchTerms narrows the set
// before anything is downloaded — without that a large university returns
// thousands of unrelated administrative posts.
interface WorkdayPosting {
  title?: string;
  externalPath?: string;
  locationsText?: string;
  postedOn?: string;
}

// Read a JSON reply, or say what came back instead. A careers site in
// maintenance or behind a bot check answers with an HTML page; without this the
// run log would say "Unexpected token <", which tells nobody what happened.
async function readJson(
  response: Response,
  label: string,
): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    let where = '';
    try {
      const u = new URL(response.url);
      where = ` from ${u.host}${u.pathname}`;
    } catch {
      // no usable address on the response
    }
    const type = response.headers?.get('content-type') ?? 'unknown type';
    throw new Error(
      `${label} did not return JSON (got ${type}${where}); the site may be down for maintenance or blocking automated requests`,
    );
  }
}

const WORKDAY_PAGE_SIZE = 20; // Workday caps `limit` at 20 regardless of what you ask for.

async function workdayPost(
  url: string,
  body: unknown,
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Workday search returned HTTP ${response.status}`);
  }
  return await readJson(response, 'Workday');
}

export async function workdayAdapter(
  feedUrl: string,
  config: Record<string, unknown>,
): Promise<RawJob[]> {
  const institution = String(config.institution ?? '');
  if (!institution) {
    throw new Error('workday adapter requires config.institution');
  }

  // The search endpoint ends in /jobs; job detail hangs off the same base.
  const base = feedUrl.replace(/\/jobs\/?$/, '');
  const searchTerms = Array.isArray(config.search_terms) && config.search_terms.length
    ? (config.search_terms as string[])
    : ['computational social science'];
  const maxPerTerm = Number(config.max_per_term ?? 40);

  const postings = new Map<string, WorkdayPosting>();

  for (const term of searchTerms) {
    for (let offset = 0; offset < maxPerTerm; offset += WORKDAY_PAGE_SIZE) {
      const page = await workdayPost(feedUrl, {
        appliedFacets: {},
        limit: WORKDAY_PAGE_SIZE,
        offset,
        searchText: term,
      });

      const batch = (page.jobPostings ?? []) as WorkdayPosting[];
      for (const posting of batch) {
        // The same job matches several search terms; keyed by path so each is
        // only fetched once.
        if (posting.externalPath) postings.set(posting.externalPath, posting);
      }

      if (batch.length < WORKDAY_PAGE_SIZE) break;
      if (offset + WORKDAY_PAGE_SIZE < maxPerTerm) await sleep(300);
    }
  }

  const jobs: RawJob[] = [];
  for (const [path, posting] of postings) {
    // A failed detail fetch drops one job rather than the whole source: these
    // are third-party endpoints and a single 404 shouldn't fail a run.
    try {
      const detail = await fetch(`${base}${path}`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      });
      if (!detail.ok) continue;

      const info = ((await detail.json()) as Record<string, unknown>)
        .jobPostingInfo as Record<string, unknown> | undefined;
      if (!info) continue;

      const description = String(info.jobDescription ?? '');
      const externalUrl = String(info.externalUrl ?? '');
      if (!description || !externalUrl) continue;

      jobs.push({
        title: String(info.title ?? posting.title ?? ''),
        institution,
        location: String(
          info.location ?? posting.locationsText ?? config.location ?? 'Not specified',
        ),
        description,
        sourceUrl: externalUrl,
        sourceJobId: String(info.jobReqId ?? path),
        postedAt: String(info.startDate ?? posting.postedOn ?? ''),
      });
    } catch {
      continue;
    }

    await sleep(250); // Be a polite guest on someone else's careers site.
  }

  return jobs;
}

// Oracle Recruiting Cloud: the "candidate experience" careers sites that Stanford
// and many other universities run. The page is a JavaScript app over a public
// REST service, so this reads the same service the page does:
//   list:   .../hcmRestApi/resources/latest/recruitingCEJobRequisitions
//   detail: .../hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails
// feed_url is the site's origin (for example https://careersearch.stanford.edu);
// config needs `institution` and `site_number` (the "sites/<name>" part of the
// careers page address), and may have `search_terms`, `max_per_term`, `location`.
interface OracleRequisition {
  Id?: string;
  Title?: string;
  PrimaryLocation?: string;
  PostedDate?: string;
}

const ORACLE_PAGE_SIZE = 25;

async function oracleGet(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Oracle Recruiting returned HTTP ${response.status}`);
  }
  return await readJson(response, 'Oracle Recruiting');
}

export async function oracleRecruitingAdapter(
  feedUrl: string,
  config: Record<string, unknown>,
): Promise<RawJob[]> {
  const institution = String(config.institution ?? '');
  if (!institution) {
    throw new Error('oracle-recruiting adapter requires config.institution');
  }
  const site = String(config.site_number ?? '');
  if (!site) {
    throw new Error('oracle-recruiting adapter requires config.site_number');
  }

  const base = feedUrl.replace(/\/+$/, '');
  const api = `${base}/hcmRestApi/resources/latest`;
  const searchTerms = Array.isArray(config.search_terms) && config.search_terms.length
    ? (config.search_terms as string[])
    : ['computational social science'];
  const maxPerTerm = Number(config.max_per_term ?? 40);

  const requisitions = new Map<string, OracleRequisition>();

  for (const term of searchTerms) {
    for (let offset = 0; offset < maxPerTerm; offset += ORACLE_PAGE_SIZE) {
      const keyword = encodeURIComponent(term);
      const page = await oracleGet(
        `${api}/recruitingCEJobRequisitions?onlyData=true` +
          `&expand=requisitionList.secondaryLocations` +
          `&finder=findReqs;siteNumber=${site},keyword=%22${keyword}%22,` +
          `limit=${ORACLE_PAGE_SIZE},offset=${offset}`,
      );

      const result = ((page.items ?? []) as Record<string, unknown>[])[0] ?? {};
      const batch = (result.requisitionList ?? []) as OracleRequisition[];
      for (const requisition of batch) {
        // The same job matches several search terms; keyed by id so each is
        // only fetched once.
        if (requisition.Id) requisitions.set(String(requisition.Id), requisition);
      }

      if (batch.length < ORACLE_PAGE_SIZE) break;
      if (offset + ORACLE_PAGE_SIZE < maxPerTerm) await sleep(300);
    }
  }

  const jobs: RawJob[] = [];
  for (const [id, requisition] of requisitions) {
    // A failed detail fetch drops one job rather than the whole source.
    try {
      const detail = await oracleGet(
        `${api}/recruitingCEJobRequisitionDetails?expand=all&onlyData=true` +
          `&finder=ById;Id=%22${encodeURIComponent(id)}%22,siteNumber=${site}`,
      );
      const info = ((detail.items ?? []) as Record<string, unknown>[])[0];
      if (!info) continue;

      // The posting is split into a description, duties and qualifications.
      const description = [
        info.ExternalDescriptionStr,
        info.ExternalResponsibilitiesStr,
        info.ExternalQualificationsStr,
      ].map((part) => String(part ?? '').trim()).filter(Boolean).join('\n\n');
      if (!description) continue;

      jobs.push({
        title: String(info.Title ?? requisition.Title ?? ''),
        institution,
        location: String(
          info.PrimaryLocation ?? requisition.PrimaryLocation ?? config.location ??
            'Not specified',
        ),
        description,
        sourceUrl: `${base}/hcmUI/CandidateExperience/en/sites/${site}/job/${id}`,
        sourceJobId: id,
        postedAt: String(
          info.ExternalPostedStartDate ?? requisition.PostedDate ?? '',
        ),
      });
    } catch {
      continue;
    }

    await sleep(250); // Be a polite guest on someone else's careers site.
  }

  return jobs;
}

// PeopleAdmin: the hiring system behind many US university job sites (UNC Chapel Hill,
// the University of Vermont, George Washington). Each site publishes an Atom feed of
// postings, searchable with ?query=, but an entry carries only a title and a link, so the
// description comes from the posting page itself.
//   list:   <feed_url>?query=<term>   (an Atom feed of postings)
//   detail: the entry's link, an HTML page; its text after "Posting Information" is used
// feed_url is the site's .../postings/search.atom. config needs `institution` and may have
// `search_terms` and `max_per_term` (default 30, the size of the first page).
// A removed posting redirects to /postings (the list), which the link check treats as dead.
function peopleAdminDescription(html: string): string {
  const text = stripHtml(html);
  const at = text.search(/Posting Information/i);
  return (at >= 0 ? text.slice(at) : text).trim();
}

export async function peopleAdminAdapter(
  feedUrl: string,
  config: Record<string, unknown>,
): Promise<RawJob[]> {
  const institution = String(config.institution ?? '');
  if (!institution) throw new Error('peopleadmin source needs config.institution');

  const terms = Array.isArray(config.search_terms) && config.search_terms.length
    ? (config.search_terms as string[])
    : [''];
  const maxPerTerm = Number(config.max_per_term ?? 30);

  const entries = new Map<string, { title: string; updated?: string }>();
  for (const term of terms) {
    const url = term ? `${feedUrl}?query=${encodeURIComponent(term)}` : feedUrl;
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/atom+xml' },
    });
    if (!response.ok) throw new Error(`PeopleAdmin returned HTTP ${response.status}`);
    const xml = await response.text();
    if (!/<feed[\s>]/i.test(xml)) {
      throw new Error('PeopleAdmin did not return an Atom feed (the site may be blocking automated requests)');
    }
    let taken = 0;
    for (const entry of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)) {
      if (taken++ >= maxPerTerm) break;
      const link = entry[1].match(/<link[^>]*href="([^"]+)"/i)?.[1];
      const title = tag(entry[1], 'title');
      if (!link || !title) continue;
      // A search with no results returns a placeholder entry, not an empty feed.
      if (/no positions currently open/i.test(title)) continue;
      entries.set(link, { title, updated: tag(entry[1], 'updated') });
    }
    await sleep(300);
  }

  const jobs: RawJob[] = [];
  for (const [link, entry] of entries) {
    let html: string;
    try {
      const page = await fetch(link, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      });
      if (page.status !== 200) continue;
      html = await page.text();
    } catch {
      continue;
    }
    const description = peopleAdminDescription(html);
    if (!description) continue;
    jobs.push({
      title: entry.title,
      institution,
      location: String(config.location ?? 'See posting'),
      description,
      jobType: entry.title,
      sourceUrl: link,
      sourceJobId: link.match(/\/postings\/(\d+)/)?.[1] ?? link,
      applicationUrl: link,
      postedAt: entry.updated,
    });
    await sleep(250);
  }
  return jobs;
}

// SmartRecruiters: a hiring platform that publishes a public, documented Posting API
// (Notre Dame's careers site, careers.nd.edu, is hosted on it).
//   list:   <feed_url>?q=<term>&limit=100&offset=<n>   (id, name, released date, location)
//   detail: <feed_url>/<id>                             (description sections, links)
// feed_url is https://api.smartrecruiters.com/v1/companies/<CompanyId>/postings; the
// CompanyId is the one in the careers address (jobs.smartrecruiters.com/<CompanyId>/...).
// config needs `institution` and may have `search_terms` and `max_per_term` (default 40).
// Closed postings answer 404 on the public page, so the ordinary link check catches them.
interface SmartRecruitersListItem {
  id?: string;
  name?: string;
}

const SMARTRECRUITERS_PAGE_SIZE = 100;

async function smartRecruitersGet(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`SmartRecruiters returned HTTP ${response.status}`);
  }
  return await readJson(response, 'SmartRecruiters');
}

export async function smartRecruitersAdapter(
  feedUrl: string,
  config: Record<string, unknown>,
): Promise<RawJob[]> {
  const institution = String(config.institution ?? '');
  if (!institution) throw new Error('smartrecruiters source needs config.institution');

  const terms = Array.isArray(config.search_terms) && config.search_terms.length
    ? (config.search_terms as string[])
    : [''];
  const maxPerTerm = Number(config.max_per_term ?? 40);
  const base = feedUrl.replace(/\/+$/, '');

  const ids = new Map<string, string>();
  for (const term of terms) {
    let offset = 0;
    let taken = 0;
    while (taken < maxPerTerm) {
      const query = term ? `q=${encodeURIComponent(term)}&` : '';
      const page = await smartRecruitersGet(
        `${base}?${query}limit=${SMARTRECRUITERS_PAGE_SIZE}&offset=${offset}`,
      );
      const content = (page.content as SmartRecruitersListItem[] | undefined) ?? [];
      for (const item of content) {
        if (taken >= maxPerTerm) break;
        if (item.id) ids.set(item.id, item.name ?? '');
        taken++;
      }
      if (content.length < SMARTRECRUITERS_PAGE_SIZE) break;
      offset += SMARTRECRUITERS_PAGE_SIZE;
      await sleep(300);
    }
  }

  const jobs: RawJob[] = [];
  for (const id of ids.keys()) {
    let detail: Record<string, unknown>;
    try {
      detail = await smartRecruitersGet(`${base}/${id}`);
    } catch {
      continue; // a posting that vanished between the list and the detail
    }
    const sections = ((detail.jobAd as { sections?: Record<string, { text?: string }> } | undefined)
      ?.sections) ?? {};
    const description = ['jobDescription', 'qualifications', 'additionalInformation', 'companyDescription']
      .map((k) => sections[k]?.text ?? '')
      .filter(Boolean)
      .join('\n\n');
    const link = String(detail.postingUrl ?? '');
    const title = String(detail.name ?? '');
    if (!description || !link || !title) continue;

    const place = detail.location as { fullLocation?: string; city?: string } | undefined;
    jobs.push({
      title,
      institution,
      location: place?.fullLocation || place?.city || 'See posting',
      description,
      jobType: title,
      sourceUrl: link,
      sourceJobId: id,
      applicationUrl: String(detail.applyUrl ?? link),
      postedAt: typeof detail.releasedDate === 'string' ? detail.releasedDate : undefined,
    });
    await sleep(250);
  }
  return jobs;
}

// A Google Sheet published to the web as CSV (File > Share > Publish to web).
// Some people keep curated hiring lists this way, so this reads one row per
// position. Columns are found by their heading, so a sheet with a different
// column order still works:
//   institution (a "University - Department" value is split), position, brief
//   description, deadline, status ("date guidance"), application link, notes.
// feed_url is the published CSV address (".../pub?output=csv"). config may have
// `location` (the sheet has none; default "See posting") and `institution`
// (used when a row has no institution cell).
//
// A row the sheet itself marks as over ("deadline passed", "portal closed",
// "posting unavailable") is skipped here, so the queue is not filled with closed jobs.

/** Minimal RFC 4180 parser: quoted cells, doubled quotes, newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        cell += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      rows.push(row);
      row = [];
    } else {
      cell += c;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const SHEET_CLOSED = /passed|closed|unavailable|expired|withdrawn|filled/i;

export async function csvSheetAdapter(
  feedUrl: string,
  config: Record<string, unknown>,
): Promise<RawJob[]> {
  const response = await fetch(feedUrl, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/csv' },
  });
  if (!response.ok) {
    throw new Error(`Sheet returned HTTP ${response.status}`);
  }
  const text = await response.text();
  if (/^\s*<(!doctype|html)/i.test(text)) {
    throw new Error(
      'Sheet did not return CSV (it must be published to the web as CSV, ".../pub?output=csv")',
    );
  }

  const rows = parseCsv(text);
  const headerAt = rows.findIndex(
    (r) =>
      r.some((c) => /position|title|role/i.test(c)) &&
      r.some((c) => /institution|employer|university|school/i.test(c)),
  );
  if (headerAt < 0) {
    throw new Error('Sheet has no heading row with an institution and a position column');
  }
  const header = rows[headerAt];
  const find = (re: RegExp) => header.findIndex((h) => re.test(h));
  const cInst = find(/institution|employer|university|school/i);
  const cTitle = find(/position|title|role/i);
  const cDesc = find(/description/i);
  const cDeadline = find(/deadline|review date/i);
  const cGuide = find(/date guidance|status/i);
  const cLink = find(/^application|^apply/i);
  const cNotes = find(/notes/i);
  if (cLink < 0) throw new Error('Sheet has no application link column');

  const cellAt = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim() : '');
  const defaultInstitution = String(config.institution ?? '');
  const location = String(config.location ?? 'See posting');

  return rows.slice(headerAt + 1).flatMap((r): RawJob[] => {
    const guidance = cellAt(r, cGuide);
    if (SHEET_CLOSED.test(guidance)) return [];

    const link = cellAt(r, cLink).match(/https?:\/\/\S+/)?.[0];
    const title = cellAt(r, cTitle);
    if (!link || !title) return [];

    // "Aarhus University — Computer Science" -> institution + department.
    const [institution, ...rest] = cellAt(r, cInst).split(/\s+[—–-]\s+/);
    const department = rest.join(' - ');
    const deadlineText = cellAt(r, cDeadline);

    const parts = [
      `${title} at ${institution || defaultInstitution}${department ? ` (${department})` : ''}.`,
      cellAt(r, cDesc),
      cellAt(r, cNotes),
      deadlineText ? `Stated deadline or review date: ${deadlineText}.` : '',
    ];
    // Only a clearly upcoming deadline becomes the job's closing date; rolling and
    // "review begins" dates must not retire a job that is still taking applications.
    const iso = deadlineText.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (iso && /upcoming deadline/i.test(guidance)) {
      parts.push(`Application deadline: ${iso}.`);
    }

    return [{
      title,
      institution: institution || defaultInstitution,
      location,
      description: parts.filter(Boolean).join(' '),
      jobType: title,
      sourceUrl: link,
      sourceJobId: link,
      applicationUrl: link,
    }];
  });
}

// SAP SuccessFactors career sites (Duke, Purdue, TU Delft, Vienna, Toronto). Every such
// site publishes a sitemap of all its jobs, and each job page carries schema.org markup.
//   list:   <feed_url>/sitemap.xml   (one <loc> per job; the address contains the title)
//   detail: the job page             (itemprop title, description, streetAddress, dates)
// feed_url is the site's root address. A large employer lists a thousand jobs, mostly not
// academic, so the title in each address is matched against `search_terms` first and only
// matching pages are downloaded. config needs `institution`; it may have `search_terms`
// (default: the academic and research words below) and `max_jobs` (default 40).
// A removed job answers 404, so the ordinary link check catches closed ones.
const SUCCESSFACTORS_DEFAULT_TERMS = [
  'postdoc', 'post-doc', 'postdoctoral', 'phd', 'doctoral', 'professor', 'faculty',
  'lecturer', 'tenure', 'research scientist', 'research associate', 'research fellow',
  'research engineer', 'researcher', 'data scientist', 'computational',
];

export function successFactorsTitleFromUrl(url: string): string {
  const slug = url.match(/\/job\/([^/]+)\//)?.[1] ?? '';
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch { /* keep the raw slug */ }
  return decoded.replace(/-/g, ' ').toLowerCase();
}

function successFactorsMeta(html: string, prop: string): string | undefined {
  return html.match(
    new RegExp(`<meta[^>]*itemprop="${prop}"[^>]*content="([^"]*)"`, 'i'),
  )?.[1];
}

function successFactorsDate(value?: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

// The description sits in a <span> that holds other spans, so find its own closing tag
// by counting opening and closing spans from the start.
export function successFactorsDescription(html: string): string {
  const start = html.search(/<span[^>]*itemprop="description"/i);
  if (start < 0) return '';
  const open = html.indexOf('>', start) + 1;
  let depth = 1;
  for (const tagMatch of html.slice(open).matchAll(/<(\/?)span\b[^>]*>/gi)) {
    depth += tagMatch[1] ? -1 : 1;
    if (depth === 0) return html.slice(open, open + (tagMatch.index ?? 0));
  }
  return html.slice(open);
}

function successFactorsLocation(html: string): string | undefined {
  const parts = ['addressLocality', 'addressRegion', 'addressCountry']
    .map((prop) => successFactorsMeta(html, prop))
    .filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(', ') : successFactorsMeta(html, 'streetAddress');
}

export async function successFactorsAdapter(
  feedUrl: string,
  config: Record<string, unknown>,
): Promise<RawJob[]> {
  const institution = String(config.institution ?? '');
  if (!institution) throw new Error('successfactors source needs config.institution');

  const root = feedUrl.replace(/\/+$/, '');
  const terms = (Array.isArray(config.search_terms) && config.search_terms.length
    ? (config.search_terms as string[])
    : SUCCESSFACTORS_DEFAULT_TERMS).map((term) => term.toLowerCase());
  const maxJobs = Number(config.max_jobs ?? 40);

  const response = await fetch(`${root}/sitemap.xml`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/xml' },
  });
  if (response.status !== 200) throw new Error(`SuccessFactors returned HTTP ${response.status}`);
  const xml = await response.text();
  if (!/<urlset[\s>]/i.test(xml)) {
    throw new Error('SuccessFactors did not return a sitemap (the site may be blocking automated requests)');
  }

  const links: string[] = [];
  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
    const link = match[1].trim().replace(/&amp;/g, '&');
    if (!/\/job\//.test(link)) continue;
    const title = successFactorsTitleFromUrl(link);
    if (terms.some((term) => title.includes(term))) links.push(link);
  }

  const jobs: RawJob[] = [];
  const attempts = links.slice(0, maxJobs);
  let lastProblem = '';
  for (const link of attempts) {
    let html: string;
    try {
      const page = await fetch(link, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      });
      // 200 only: a 202 is a bot-challenge page, which must never be imported as a job.
      if (page.status !== 200) {
        lastProblem = `HTTP ${page.status}`;
        continue;
      }
      html = await page.text();
    } catch (error) {
      lastProblem = error instanceof Error ? error.message : 'request failed';
      continue;
    }
    const title = stripHtml(
      html.match(/itemprop="title"[^>]*>([\s\S]*?)<\/span>/i)?.[1] ??
        html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '',
    );
    const description = stripHtml(successFactorsDescription(html));
    if (!title || !description) continue;

    const deadline = successFactorsDate(successFactorsMeta(html, 'validThrough'));
    jobs.push({
      title,
      institution,
      location: successFactorsLocation(html) ?? String(config.location ?? 'See posting'),
      // First, because the importer reads only the start of a description for a deadline.
      description: deadline
        ? `Application deadline: ${deadline.slice(0, 10)}.\n\n${description}`
        : description,
      jobType: title,
      sourceUrl: link,
      sourceJobId: link.match(/\/(\d+)\/?$/)?.[1] ?? link,
      applicationUrl: link,
      postedAt: successFactorsDate(successFactorsMeta(html, 'datePosted')),
    });
    await sleep(250);
  }
  // Jobs were listed but not one page could be read: an outage or a block, not "no jobs".
  if (!jobs.length && attempts.length && lastProblem) {
    throw new Error(`SuccessFactors: none of ${attempts.length} job pages could be read (last: ${lastProblem})`);
  }
  return jobs;
}

// University of California "AP Recruit" sites (Berkeley, Davis, San Diego, UCLA): one
// piece of software, one site per campus for academic jobs.
//   list:   <feed_url>   (the campus's /apply page: every open recruitment in one table)
//   detail: <origin>/JPF<number>   (position overview, dates, description, qualifications)
// feed_url is the campus's `/apply` address. The table is long and mixed, so rows are
// kept when their title or unit contains one of `search_terms` (default below) and up to
// `max_jobs` (default 40) pages are opened. config needs `institution`. A closed
// recruitment answers 404, so the ordinary link check catches it.
const UC_DEFAULT_TERMS = [
  ...SUCCESSFACTORS_DEFAULT_TERMS, 'data science', 'computing', 'social science',
  'information', 'statistic', 'political', 'public policy', 'sociology', 'economics',
];

// A campus lists hundreds of recruitments, so those about data, computing and the social
// sciences are opened first and the rest only if the `max_jobs` limit leaves room.
const UC_PRIORITY_TERMS = [
  'data science', 'computing', 'computational', 'social science', 'information', 'statistic',
  'political', 'public policy', 'sociology', 'economics', 'postdoc', 'data scientist',
];

export interface UcRow { id: string; title: string; unit: string }

export function ucRows(html: string): UcRow[] {
  const rows: UcRow[] = [];
  for (const row of html.matchAll(/<tr id="(JPF\d+)"[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const unit = html.slice(0, row.index).match(/data-section="([^"]*)"(?![\s\S]*data-section=)/)?.[1] ?? '';
    const title = stripHtml(row[2].match(/<div class='name'>([\s\S]*?)<\/div>/i)?.[1] ?? '');
    if (title) rows.push({ id: row[1], title, unit: stripHtml(unit) });
  }
  return rows;
}

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';

function ucDate(text: string, label: string): string | undefined {
  const m = text.match(new RegExp(`${label}:\\s*(?:[A-Za-z]+,\\s*)?(${MONTHS}|[A-Z][a-z]{2})\\s+(\\d{1,2}),\\s*(\\d{4})`));
  if (!m) return undefined;
  const parsed = new Date(`${m[1]} ${m[2]}, ${m[3]} 12:00:00 UTC`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
}

// Written as "October 12, 2027" because the importer reads that form of "Application
// deadline" before any "apply by <date>" in the text. UC postings often say "apply by
// <review date> for full consideration" while accepting applications until the final date.
function ucLongDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return `${MONTHS.split('|')[month - 1]} ${day}, ${year}`;
}

export async function ucRecruitAdapter(
  feedUrl: string,
  config: Record<string, unknown>,
): Promise<RawJob[]> {
  const institution = String(config.institution ?? '');
  if (!institution) throw new Error('uc-recruit source needs config.institution');

  const terms = (Array.isArray(config.search_terms) && config.search_terms.length
    ? (config.search_terms as string[])
    : UC_DEFAULT_TERMS).map((term) => term.toLowerCase());
  const maxJobs = Number(config.max_jobs ?? 40);
  const origin = new URL(feedUrl).origin;

  const response = await fetch(feedUrl, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
  });
  if (response.status !== 200) throw new Error(`UC Recruit returned HTTP ${response.status}`);
  const rows = ucRows(await response.text());
  if (!rows.length) {
    throw new Error('UC Recruit page had no recruitments (the layout may have changed or the site is blocking automated requests)');
  }

  const haystackOf = (row: UcRow) => `${row.title} ${row.unit}`.toLowerCase();
  const matching = rows.filter((row) => terms.some((term) => haystackOf(row).includes(term)));
  const isPriority = (row: UcRow) => UC_PRIORITY_TERMS.some((term) => haystackOf(row).includes(term));
  const wanted = [...matching.filter(isPriority), ...matching.filter((row) => !isPriority(row))];

  const jobs: RawJob[] = [];
  const attempts = wanted.slice(0, maxJobs);
  let lastProblem = '';
  for (const row of attempts) {
    const link = `${origin}/${row.id}`;
    let html: string;
    try {
      const page = await fetch(link, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      });
      // 200 only: a 202 is a bot-challenge page, which must never be imported as a job.
      if (page.status !== 200) {
        lastProblem = `HTTP ${page.status}`;
        continue;
      }
      html = await page.text();
    } catch (error) {
      lastProblem = error instanceof Error ? error.message : 'request failed';
      continue;
    }
    const start = html.search(/<h3[^>]*>\s*Position overview/i);
    if (start < 0) continue;
    const end = html.search(/<h3[^>]*id="requirements"/i);
    const text = stripHtml(html.slice(start, end > start ? end : undefined));
    if (!text) continue;

    const deadline = ucDate(text, 'Final date');
    jobs.push({
      title: row.title,
      institution,
      location: String(config.location ?? 'California, US'),
      description: `${deadline ? `Application deadline: ${ucLongDate(deadline)}.\n\n` : ''}${row.unit ? `${row.unit}. ` : ''}${text}`,
      jobType: row.title,
      sourceUrl: link,
      sourceJobId: row.id,
      applicationUrl: link,
      postedAt: ucDate(text, 'Open date'),
    });
    await sleep(250);
  }
  if (!jobs.length && attempts.length && lastProblem) {
    throw new Error(`UC Recruit: none of ${attempts.length} recruitment pages could be read (last: ${lastProblem})`);
  }
  return jobs;
}

// A generic reader for career sites that list their jobs on an HTML page and give each job
// its own page: ETH Zurich, IT University of Copenhagen, the University of Copenhagen
// (HR-Manager), Amsterdam, Loughborough, WZB. One reader, configured per site.
//   list:   feed_url (and any `extra_list_urls`), an HTML page of links
//   detail: each link whose address matches `link_pattern`
// config needs `institution` and `link_pattern` (a regular expression tested against the full
// address). Optional: `content_id` (the id of the element holding the advert text; otherwise a
// JobPosting block or the page's <main>/<article> is used), `exclude_pattern`, `title_filter`
// (words; keep a job only if its link text contains one), `location`, `max_jobs` (default 40).
// If feed_url is a sitemap (<urlset>), its addresses are the list and the title is taken from the
// address; then `slug_terms` (keep addresses whose title contains one), `priority_terms` (open
// those first), `max_pages` (pages to open, default max_jobs), `delay_ms` (pause between requests,
// default 250; set it to a site's robots.txt Crawl-delay), `title_from: "list"` (use the link
// text on the list page as the title, for sites whose job pages share one banner heading) or
// `title_from: "last-h1"` (the last <h1> on the page, for sites whose first heading is the section
// name), `newest_first` (open the addresses with the highest number first: sitemaps usually list
// the oldest jobs first), `deadline_pattern` (a regular expression whose first group is the
// closing date written as 18.12.2026, 18/12/2026 or 2026-12-18, for sites that give it as text
// in another language: it is rewritten as "Application deadline: 2026-12-18.") and `employers`
// (keep a job only if its JobPosting's hiringOrganization contains one of these words) apply. A sitemap is how
// jobs.ac.uk (UK universities, many employers on one site) and Houston are read.
// Closed jobs answer 404 or redirect, so the ordinary link check catches them.
function absoluteUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href.replace(/&amp;/g, '&'), base);
    url.hash = '';
    return /^https?:$/.test(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

// "18.12.2026", "18/12/2026" or "2026-12-18" as YYYY-MM-DD; null when it is not a real date.
export function dayMonthYear(text: string): string | null {
  const iso = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  const eu = text.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  const [year, month, day] = iso
    ? [iso[1], iso[2], iso[3]].map(Number)
    : eu
    ? [eu[3], eu[2], eu[1]].map(Number)
    : [0, 0, 0];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (!year || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

// The element with this id, found by counting opening and closing tags of its kind.
export function elementById(html: string, id: string): string {
  const open = html.match(new RegExp(`<([a-z0-9]+)\\b[^>]*\\bid=["']${id}["'][^>]*>`, 'i'));
  if (!open || open.index === undefined) return '';
  const tagName = open[1].toLowerCase();
  const start = open.index + open[0].length;
  let depth = 1;
  for (const tagMatch of html.slice(start).matchAll(new RegExp(`<(/?)${tagName}\\b[^>]*>`, 'gi'))) {
    depth += tagMatch[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, start + (tagMatch.index ?? 0));
  }
  return html.slice(start);
}

interface JobPostingLd {
  title?: string;
  description?: string;
  datePosted?: string;
  validThrough?: string;
  jobLocation?: unknown;
  hiringOrganization?: unknown;
}

export function jobPostingFromHtml(html: string): JobPostingLd | null {
  for (const block of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(block[1]);
      const nodes: unknown[] = Array.isArray(data) ? data : [data, ...(Array.isArray(data?.['@graph']) ? data['@graph'] : [])];
      for (const node of nodes) {
        const type = (node as { '@type'?: unknown })?.['@type'];
        if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) {
          return node as JobPostingLd;
        }
      }
    } catch { /* not valid JSON: try the next block */ }
  }
  return null;
}

// "City, Region, Country" from a JobPosting's jobLocation, when it has an address.
function jobPostingLocation(posting: JobPostingLd | null): string | undefined {
  const place = Array.isArray(posting?.jobLocation) ? posting?.jobLocation[0] : posting?.jobLocation;
  const address = (place as { address?: unknown } | undefined)?.address;
  if (typeof address === 'string') return address || undefined;
  if (!address || typeof address !== 'object') return undefined;
  const a = address as Record<string, unknown>;
  const country = typeof a.addressCountry === 'object' && a.addressCountry
    ? (a.addressCountry as { name?: unknown }).name
    : a.addressCountry;
  const parts = [a.addressLocality, a.addressRegion, country]
    .filter((part): part is string => typeof part === 'string' && part.length > 0);
  return parts.length ? parts.join(', ') : undefined;
}

function htmlJobText(html: string, contentId?: string): string {
  if (contentId) {
    const inner = elementById(html, contentId);
    if (inner) return stripHtml(inner);
  }
  const posting = jobPostingFromHtml(html);
  if (posting?.description) return stripHtml(posting.description);
  const main = html.match(/<(main|article)\b[^>]*>([\s\S]*?)<\/\1>/i)?.[2] ?? html;
  return stripHtml(
    main
      .replace(/<(nav|header|footer|aside|form|script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' '),
  );
}

export async function htmlJobsAdapter(
  feedUrl: string,
  config: Record<string, unknown>,
): Promise<RawJob[]> {
  const institution = String(config.institution ?? '');
  if (!institution) throw new Error('html-jobs source needs config.institution');
  const patternSource = String(config.link_pattern ?? '');
  if (!patternSource) throw new Error('html-jobs source needs config.link_pattern');
  const linkPattern = new RegExp(patternSource);
  const exclude = config.exclude_pattern ? new RegExp(String(config.exclude_pattern)) : null;
  const filter = Array.isArray(config.title_filter)
    ? (config.title_filter as string[]).map((word) => word.toLowerCase())
    : [];
  const maxJobs = Number(config.max_jobs ?? 40);
  const delay = Number(config.delay_ms ?? 250);
  const lists = [feedUrl, ...(Array.isArray(config.extra_list_urls) ? (config.extra_list_urls as string[]) : [])];

  const lower = (value: unknown) =>
    (Array.isArray(value) ? (value as string[]) : []).map((word) => word.toLowerCase());
  const slugTerms = lower(config.slug_terms);
  const priorityTerms = lower(config.priority_terms);
  const employers = lower(config.employers);
  const deadlinePattern = config.deadline_pattern ? new RegExp(String(config.deadline_pattern), 'i') : null;
  const numberIn = (link: string) =>
    Math.max(0, ...[...link.matchAll(/\d+/g)].map((digits) => Number(digits[0])).filter((n) => n < 1e9));
  const slugOf = (link: string) => {
    try {
      return decodeURIComponent(new URL(link).pathname.replace(/\/+$/, '').split('/').pop() ?? '')
        .replace(/[-_+]/g, ' ').toLowerCase();
    } catch {
      return '';
    }
  };

  const found = new Map<string, string>();
  for (const listUrl of lists) {
    const response = await fetch(listUrl, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xml' },
    });
    if (response.status !== 200) throw new Error(`Job list returned HTTP ${response.status}`);
    const html = await response.text();
    if (/<urlset[\s>]/i.test(html)) {
      for (const loc of html.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
        const link = absoluteUrl(loc[1].trim(), response.url || listUrl);
        if (!link || !linkPattern.test(link) || exclude?.test(link)) continue;
        const slug = slugOf(link);
        if (slugTerms.length && !slugTerms.some((term) => slug.includes(term))) continue;
        found.set(link, slug);
      }
      await sleep(delay);
      continue;
    }
    for (const anchor of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      const link = absoluteUrl(anchor[1], response.url || listUrl);
      if (!link || !linkPattern.test(link) || exclude?.test(link)) continue;
      const text = stripHtml(anchor[2]);
      // A job often has an image link and a title link to the same page: keep the title.
      if (!found.has(link) || (found.get(link) ?? '').length < text.length) found.set(link, text);
    }
    await sleep(delay);
  }
  if (!found.size) {
    throw new Error('Job list had no links matching link_pattern (the layout may have changed or the site is blocking automated requests)');
  }

  const wanted = [...found].filter(([, text]) =>
    !filter.length || filter.some((word) => text.toLowerCase().includes(word))
  );
  // Jobs about the community's subjects first, so the page limit does not cut them off.
  const isPriority = ([, text]: [string, string]) =>
    priorityTerms.some((term) => text.toLowerCase().includes(term));
  const ordered = config.newest_first
    ? [...wanted].sort((a, b) => numberIn(b[0]) - numberIn(a[0]))
    : wanted;
  const links = (priorityTerms.length
    ? [...ordered.filter(isPriority), ...ordered.filter((entry) => !isPriority(entry))]
    : ordered
  ).slice(0, Number(config.max_pages ?? maxJobs));

  const jobs: RawJob[] = [];
  let lastProblem = '';
  for (const [link, listText] of links) {
    let html: string;
    try {
      const page = await fetch(link, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' } });
      // 200 only: a 202 is a bot-challenge page, which must never be imported as a job.
      if (page.status !== 200) {
        lastProblem = `HTTP ${page.status}`;
        continue;
      }
      html = await page.text();
    } catch (error) {
      lastProblem = error instanceof Error ? error.message : 'request failed';
      continue;
    }
    const posting = jobPostingFromHtml(html);
    if (employers.length) {
      const org = posting?.hiringOrganization;
      const name = String(typeof org === 'object' && org ? (org as { name?: unknown }).name ?? '' : org ?? '')
        .toLowerCase();
      if (!employers.some((word) => name.includes(word))) continue;
    }
    const headings = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) => match[1]);
    const heading = config.title_from === 'last-h1' ? headings[headings.length - 1] : headings[0];
    const title = config.title_from === 'list' && listText
      ? listText
      : stripHtml(posting?.title ?? heading ?? listText).trim() || listText;
    const description = htmlJobText(html, config.content_id ? String(config.content_id) : undefined);
    if (!title || !description) continue;
    let deadline = posting?.validThrough ? new Date(posting.validThrough) : null;
    if (!deadline && deadlinePattern) {
      const written = description.match(deadlinePattern)?.[1];
      const day = written ? dayMonthYear(written) : null;
      deadline = day ? new Date(`${day}T00:00:00Z`) : null;
    }
    jobs.push({
      title,
      institution,
      location: jobPostingLocation(posting) ?? String(config.location ?? 'See posting'),
      description: deadline && !Number.isNaN(deadline.getTime())
        ? `Application deadline: ${deadline.toISOString().slice(0, 10)}.\n\n${description}`
        : description,
      jobType: title,
      sourceUrl: link,
      sourceJobId: link.match(/(?:ProjectId|VACANCY_ID|prj|id)=([A-Za-z0-9_-]+)/i)?.[1] ?? link,
      applicationUrl: link,
      postedAt: posting?.datePosted,
    });
    if (jobs.length >= maxJobs) break;
    await sleep(delay);
  }
  if (!jobs.length && links.length && lastProblem) {
    throw new Error(`Job list: none of ${links.length} job pages could be read (last: ${lastProblem})`);
  }
  return jobs;
}

// Prospective (prospective.ch) career centres: the University of Zurich and other Swiss employers.
// The public career page is a script app that reads this JSON address, which is the feed_url:
//   https://ohws.prospective.ch/public/v1/medium/<number>/jobs
// (find <number> in the iframe address "ohws.prospective.ch/public/v2/careercenter/<number>/").
// Each job carries its text in a few fields; its public page is `links.directlink`, which answers
// 404 once the job is gone. config: `institution` (required), `lang` (default "en"),
// `page_size` (default 50), `max_jobs` (default 150), `location` (used when the job has none).
const PROSPECTIVE_TEXT_FIELDS = [
  'sza_department',
  'sza_workplace',
  'sza_introduction',
  'sza_tasks',
  'sza_requirements',
  'sza_benefits',
];

export async function prospectiveAdapter(
  feedUrl: string,
  config: Record<string, unknown>,
): Promise<RawJob[]> {
  const institution = String(config.institution ?? '');
  if (!institution) throw new Error('prospective source needs config.institution');
  const lang = String(config.lang ?? 'en');
  const pageSize = Number(config.page_size ?? 50);
  const maxJobs = Number(config.max_jobs ?? 150);

  const jobs: RawJob[] = [];
  let total = Infinity;
  for (let offset = 0; offset < total && jobs.length < maxJobs; offset += pageSize) {
    const response = await fetch(`${feedUrl}?lang=${lang}&offset=${offset}&limit=${pageSize}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (response.status !== 200) throw new Error(`Prospective returned HTTP ${response.status}`);
    const data = await response.json() as {
      total?: number;
      jobs?: Array<{
        id?: string;
        title?: string;
        start_date?: string;
        end_date?: string;
        links?: { directlink?: string };
        szas?: Record<string, unknown>;
      }>;
    };
    if (!Array.isArray(data.jobs)) throw new Error('Prospective answer had no jobs list');
    total = Number(data.total ?? data.jobs.length);
    if (!data.jobs.length) break;
    for (const job of data.jobs) {
      const link = job.links?.directlink;
      const title = stripHtml(job.title ?? '').trim();
      if (!link || !title) continue;
      const fields = job.szas ?? {};
      const text = PROSPECTIVE_TEXT_FIELDS
        .map((key) => (typeof fields[key] === 'string' ? stripHtml(fields[key] as string).trim() : ''))
        .filter(Boolean)
        .join('\n\n');
      if (!text) continue;
      const end = job.end_date ? new Date(job.end_date) : null;
      const place = [fields['sza_location.city'], fields['sza_location.country']]
        .filter((part): part is string => typeof part === 'string' && part.length > 0)
        .join(', ');
      jobs.push({
        title,
        institution,
        location: place || String(config.location ?? 'See posting'),
        description: end && !Number.isNaN(end.getTime())
          ? `Application deadline: ${end.toISOString().slice(0, 10)}.\n\n${text}`
          : text,
        jobType: title,
        sourceUrl: link,
        sourceJobId: job.id ? String(job.id) : link,
        applicationUrl: link,
        postedAt: job.start_date,
      });
      if (jobs.length >= maxJobs) break;
    }
  }
  return jobs;
}

// Oracle Taleo career sections (Temple University). The section's own search page is a script
// app, but it reads a JSON address that anyone can call, and each job has a page with a JobPosting
// block. feed_url is the section's search page:
//   https://<host>/careersection/<section>/jobsearch.ftl
// config: `institution` (required), `portal` (required: the number after "portal=" in that page's
// source), `max_jobs` (default 60), `location`, `delay_ms` (default 300). A removed job's page
// answers 200 but has no JobPosting block, which the link check treats as removed.
export async function taleoAdapter(
  feedUrl: string,
  config: Record<string, unknown>,
): Promise<RawJob[]> {
  const institution = String(config.institution ?? '');
  if (!institution) throw new Error('taleo source needs config.institution');
  const portal = String(config.portal ?? '');
  if (!/^\d+$/.test(portal)) throw new Error('taleo source needs config.portal (digits)');
  const url = new URL(feedUrl);
  const section = url.pathname.match(/\/careersection\/([^/]+)\//i)?.[1];
  if (!section) throw new Error('taleo feed_url must look like https://host/careersection/<section>/jobsearch.ftl');
  const maxJobs = Number(config.max_jobs ?? 60);
  const delay = Number(config.delay_ms ?? 300);

  const filters = (ids: string[]) => ({ searchFilterSelections: ids.map((id) => ({ id, selectedValues: [] })) });
  const search = (pageNo: number) => ({
    multilineEnabled: false,
    sortingSelection: { sortBySelectionParam: '3', ascendingSortingOrder: 'false' },
    fieldData: { fields: { KEYWORD: '', LOCATION: '' }, valid: true },
    filterSelectionParam: filters(['POSTING_DATE', 'LOCATION', 'JOB_FIELD', 'JOB_TYPE', 'JOB_SCHEDULE']),
    advancedSearchFiltersSelectionParam: filters([
      'ORGANIZATION', 'LOCATION', 'JOB_FIELD', 'JOB_NUMBER', 'URGENT_JOB', 'EMPLOYEE_STATUS',
      'STUDY_LEVEL', 'WILL_TRAVEL', 'JOB_SHIFT',
    ]),
    pageNo,
  });

  const requisitions: Array<{ contestNo: string; title: string }> = [];
  let total = Infinity;
  for (let pageNo = 1; requisitions.length < total && requisitions.length < maxJobs; pageNo++) {
    const response = await fetch(`${url.origin}/careersection/rest/jobboard/searchjobs?lang=en&portal=${portal}`, {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        tz: 'GMT-05:00', // Taleo answers HTTP 500 without a time zone header
      },
      body: JSON.stringify(search(pageNo)),
    });
    if (response.status !== 200) throw new Error(`Taleo returned HTTP ${response.status}`);
    const data = await response.json() as {
      requisitionList?: Array<{ contestNo?: string; column?: string[] }>;
      pagingData?: { totalCount?: number };
      careerSectionUnAvailable?: boolean;
    };
    if (data.careerSectionUnAvailable) throw new Error('Taleo career section is unavailable');
    if (!Array.isArray(data.requisitionList)) throw new Error('Taleo answer had no requisition list');
    total = Number(data.pagingData?.totalCount ?? data.requisitionList.length);
    if (!data.requisitionList.length) break;
    for (const item of data.requisitionList) {
      const contestNo = item.contestNo ?? item.column?.[1];
      const title = (item.column?.[0] ?? '').trim();
      if (contestNo && title) requisitions.push({ contestNo: String(contestNo), title });
    }
    await sleep(delay);
  }

  const jobs: RawJob[] = [];
  let lastProblem = '';
  for (const { contestNo, title } of requisitions.slice(0, maxJobs)) {
    const link = `${url.origin}/careersection/${section}/jobdetail.ftl?job=${encodeURIComponent(contestNo)}&lang=en`;
    try {
      const page = await fetch(link, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' } });
      if (page.status !== 200) {
        lastProblem = `HTTP ${page.status}`;
        continue;
      }
      const posting = jobPostingFromHtml(await page.text());
      const description = posting?.description ? stripHtml(posting.description) : '';
      if (!description) {
        lastProblem = 'job page had no JobPosting description';
        continue;
      }
      const deadline = posting?.validThrough ? new Date(posting.validThrough) : null;
      jobs.push({
        title: stripHtml(posting?.title ?? title).trim() || title,
        institution,
        location: jobPostingLocation(posting) ?? String(config.location ?? 'See posting'),
        description: deadline && !Number.isNaN(deadline.getTime())
          ? `Application deadline: ${deadline.toISOString().slice(0, 10)}.\n\n${description}`
          : description,
        jobType: title,
        sourceUrl: link,
        sourceJobId: contestNo,
        applicationUrl: link,
        postedAt: posting?.datePosted,
      });
    } catch (error) {
      lastProblem = error instanceof Error ? error.message : 'request failed';
    }
    await sleep(delay);
  }
  if (!jobs.length && requisitions.length && lastProblem) {
    throw new Error(`Taleo: none of ${requisitions.length} job pages could be read (last: ${lastProblem})`);
  }
  return jobs;
}

// TU Graz's job portal (jobs.tugraz.at) is a script app on a public JSON service. feed_url is the
// list: https://personal.tugraz.at/api/erec/public/job-postings, and each job is at the same
// address plus "/<id>". The public page for a job is https://jobs.tugraz.at/en/jobs/<id>, which
// answers 200 for any id, so the link check asks the JSON service instead (see liveness.ts).
// config: `institution` (required), `location` (default Graz, Austria), `max_jobs` (default 60).
const TUGRAZ_TEXT_FIELDS = [
  'organisational_unit',
  'position_tasks',
  'desired_qualification',
  'admission_requirements',
  'job_benefits',
  'employer_description',
];

export async function tugrazAdapter(
  feedUrl: string,
  config: Record<string, unknown>,
): Promise<RawJob[]> {
  const institution = String(config.institution ?? '');
  if (!institution) throw new Error('tugraz source needs config.institution');
  const maxJobs = Number(config.max_jobs ?? 60);
  const delay = Number(config.delay_ms ?? 300);
  const get = (url: string) =>
    fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });

  const response = await get(feedUrl);
  if (response.status !== 200) throw new Error(`TU Graz list returned HTTP ${response.status}`);
  const list = await response.json() as Array<{ id?: string }>;
  if (!Array.isArray(list)) throw new Error('TU Graz list was not a list of jobs');

  const jobs: RawJob[] = [];
  let lastProblem = '';
  for (const item of list.slice(0, maxJobs)) {
    if (!item.id) continue;
    try {
      const detail = await get(`${feedUrl.replace(/\/+$/, '')}/${item.id}`);
      if (detail.status !== 200) {
        lastProblem = `HTTP ${detail.status}`;
        continue;
      }
      const job = await detail.json() as Record<string, unknown>;
      if (job.is_published === false) continue;
      const title = stripHtml(String(job.job_title ?? '')).trim();
      const text = TUGRAZ_TEXT_FIELDS
        .map((key) => (typeof job[key] === 'string' ? stripHtml(job[key] as string).trim() : ''))
        .filter(Boolean)
        .join('\n\n');
      if (!title || !text) continue;
      const deadline = dayMonthYear(String(job.application_deadline ?? ''));
      const link = `https://jobs.tugraz.at/en/jobs/${item.id}`;
      jobs.push({
        title,
        institution,
        location: String(config.location ?? 'Graz, Austria'),
        description: deadline ? `Application deadline: ${deadline}.\n\n${text}` : text,
        jobType: String(job.job_profile ?? title),
        sourceUrl: link,
        sourceJobId: item.id,
        applicationUrl: link,
        postedAt: typeof job.publish_from === 'string' ? job.publish_from : undefined,
      });
    } catch (error) {
      lastProblem = error instanceof Error ? error.message : 'request failed';
    }
    await sleep(delay);
  }
  if (!jobs.length && list.length && lastProblem) {
    throw new Error(`TU Graz: none of ${list.length} jobs could be read (last: ${lastProblem})`);
  }
  return jobs;
}

export const ADAPTERS: Record<
  string,
  (feedUrl: string, config: Record<string, unknown>) => Promise<RawJob[]>
> = {
  'rss-jobrxiv': jobRxivAdapter,
  'rss-comses': comsesAdapter,
  'rss-generic': genericRssAdapter,
  'workday': workdayAdapter,
  'oracle-recruiting': oracleRecruitingAdapter,
  'csv-sheet': csvSheetAdapter,
  'smartrecruiters': smartRecruitersAdapter,
  'peopleadmin': peopleAdminAdapter,
  'successfactors': successFactorsAdapter,
  'uc-recruit': ucRecruitAdapter,
  'html-jobs': htmlJobsAdapter,
  'prospective': prospectiveAdapter,
  'taleo': taleoAdapter,
  'tugraz': tugrazAdapter,
};
