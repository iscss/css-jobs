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
  return await response.json();
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

export const ADAPTERS: Record<
  string,
  (feedUrl: string, config: Record<string, unknown>) => Promise<RawJob[]>
> = {
  'rss-jobrxiv': jobRxivAdapter,
  'rss-comses': comsesAdapter,
  'rss-generic': genericRssAdapter,
  'workday': workdayAdapter,
};
