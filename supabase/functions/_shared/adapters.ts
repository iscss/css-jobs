// Source adapters: fetch a feed and return RawJob values.
//
// Adapters do no validation — normalizeJob in ingest.ts owns that. An adapter's
// only job is knowing the shape of one particular feed.

import type { RawJob } from './ingest.ts';

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
};
