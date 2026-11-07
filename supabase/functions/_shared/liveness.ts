// Is a job posting still there, and still open?
//
// Three outcomes act on a job (dead, closed) and one never does (unknown).
// The rules are structural on purpose: matching loose words like "expired"
// anywhere in a page flags every live page, because they appear in scripts and
// stylesheets. Only visible text, metadata, status codes and redirects count.

export type LinkStatus = 'live' | 'dead' | 'closed' | 'unknown';

export interface LinkCheck {
  status: LinkStatus;
  reason: string;
}

export const USER_AGENT =
  'CSSJobsBot/1.0 (+https://jobs.iscss.org; contact: admin@iscss.org)';

type FetchFn = (
  url: string,
  init?: Record<string, unknown>,
) => Promise<{
  status: number;
  url: string;
  text(): Promise<string>;
  json(): Promise<unknown>;
}>;

// Phrases that only appear in a closed-posting notice, never in boilerplate.
const CLOSED_PHRASES: RegExp[] = [
  /this (job|position|vacancy|listing|posting) (has )?(expired|closed|been filled)/i,
  /this (job|position|vacancy|listing|posting) is (no longer|now closed)/i,
  /no longer accepting applications/i,
  /(job|position|vacancy|posting) (is )?no longer available/i,
  /applications? (for this (job|position|vacancy) )?(are|is|have) (now )?closed/i,
  /this (job|position|vacancy|listing|posting) (was|has been) (removed|deleted|withdrawn|taken down)/i,
  /(job|position|vacancy|posting|listing) (is )?no longer (open|active|posted|exists?)/i,
  /(job|position|vacancy|posting|listing) (could not|cannot|can.t|was not|wasn.t) be found/i,
  /the (page|job|position|posting|listing) you (are looking for|were looking for|requested) (does not|doesn.t|is no longer)/i,
];



function visibleText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

// schema.org JobPosting carries validThrough: the date the posting closes.
function validThrough(html: string): Date | null {
  for (const block of html.matchAll(
    /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const hit = block[1].match(/"validThrough"\s*:\s*"([^"]+)"/);
    if (hit) {
      const date = new Date(hit[1]);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }
  return null;
}

export function classifyPage(input: {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  body: string;
  now?: Date;
}): LinkCheck {
  const { requestedUrl, finalUrl, status, body } = input;
  const now = input.now ?? new Date();

  if (status === 404 || status === 410) {
    return { status: 'dead', reason: `HTTP ${status}` };
  }
  // Blocked, rate limited, or the server is struggling: we know nothing.
  if (status !== 200) {
    return { status: 'unknown', reason: `HTTP ${status}` };
  }

  // A removed posting often redirects to the site's front page.
  try {
    const requested = new URL(requestedUrl);
    const final = new URL(finalUrl);
    if (
      requested.pathname.replace(/\/+$/, '') !== '' &&
      final.pathname.replace(/\/+$/, '') === '' &&
      requested.hostname === final.hostname
    ) {
      return { status: 'dead', reason: 'redirected to homepage' };
    }
  } catch {
    // Unparseable URL: fall through to the page checks.
  }

  const closes = validThrough(body);
  if (closes && closes.getTime() < now.getTime()) {
    return {
      status: 'closed',
      reason: `closing date passed (${closes.toISOString().slice(0, 10)})`,
    };
  }

  const text = visibleText(body);
  for (const pattern of CLOSED_PHRASES) {
    const hit = text.match(pattern);
    if (hit) return { status: 'closed', reason: `page says: "${hit[0]}"` };
  }

  // A future closing date in the page's own metadata is positive evidence the
  // posting is open, even if the visible text is sparse.
  if (closes) return { status: 'live', reason: 'ok' };

  // No readable text at all: a JavaScript shell (Workday and similar) that
  // returns 200 for removed postings too, so it proves nothing either way.
  if (text.trim().length === 0) {
    return { status: 'unknown', reason: 'page has no readable text (needs JavaScript)' };
  }

  return { status: 'live', reason: 'ok' };
}

// Workday career pages are JavaScript apps that return 200 for anything, so
// ask the same JSON endpoint the importer uses. Page URL:
//   https://<tenant>.wdN.myworkdayjobs.com/<site>/job/<location>/<slug>
// Job JSON:
//   https://<host>/wday/cxs/<tenant>/<site>/job/<location>/<slug>
export function workdayJsonUrl(url: string): string | null {
  // University of Washington style: the tenant is in the path, not the host.
  //   https://wd5.myworkdaysite.com/recruiting/<tenant>/<site>/job/<location>/<slug>
  const shared = url.match(
    /^(https:\/\/[^/]*myworkdaysite\.com)\/(?:[a-z]{2}-[A-Z]{2}\/)?recruiting\/([^/]+)\/([^/]+)(\/job\/.+)$/,
  );
  if (shared) {
    const [, origin, tenant, site, rest] = shared;
    return `${origin}/wday/cxs/${tenant}/${site}${rest}`;
  }

  const match = url.match(
    /^(https:\/\/([^./]+)\.[^/]*myworkdayjobs\.com)\/(?:[a-z]{2}-[A-Z]{2}\/)?([^/]+)(\/job\/.+)$/,
  );
  if (!match) return null;
  const [, origin, tenant, site, rest] = match;
  return `${origin}/wday/cxs/${tenant}/${site}${rest}`;
}

export function classifyWorkday(
  status: number,
  json: unknown,
): LinkCheck {
  if (status === 404 || status === 410) {
    return { status: 'dead', reason: `HTTP ${status}` };
  }
  if (status !== 200) return { status: 'unknown', reason: `HTTP ${status}` };

  const info = (json as { jobPostingInfo?: { canApply?: boolean } } | null)
    ?.jobPostingInfo;
  if (!info) return { status: 'unknown', reason: 'no posting data returned' };
  if (info.canApply === false) {
    return { status: 'closed', reason: 'Workday: applications closed' };
  }
  return { status: 'live', reason: 'ok' };
}

// Workday answers 403 "permission denied" for a posting that has been taken
// down, but 403 can also mean we are blocked. So a 403 only counts as removal
// when the tenant's own job search no longer lists the requisition.
//   JSON url:   https://<host>/wday/cxs/<tenant>/<site>/job/<location>/<slug>
//   Search url: https://<host>/wday/cxs/<tenant>/<site>/jobs
export function workdaySearchTarget(
  jsonUrl: string,
): { searchUrl: string; requisition: string } | null {
  const match = jsonUrl.match(/^(.*\/wday\/cxs\/[^/]+\/[^/]+)\/job\/.+_([A-Za-z0-9-]+)$/);
  if (!match) return null;
  return { searchUrl: `${match[1]}/jobs`, requisition: match[2] };
}

async function workdayRemoved(
  jsonUrl: string,
  fetchFn: FetchFn,
): Promise<LinkCheck> {
  const target = workdaySearchTarget(jsonUrl);
  if (!target) return { status: 'unknown', reason: 'HTTP 403' };
  const response = await fetchFn(target.searchUrl, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      appliedFacets: {},
      limit: 20,
      offset: 0,
      searchText: target.requisition,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (response.status !== 200) return { status: 'unknown', reason: 'HTTP 403' };
  const result = (await response.json()) as {
    total?: number;
    jobPostings?: { externalPath?: string }[];
  } | null;
  if (!result || typeof result.total !== 'number') {
    return { status: 'unknown', reason: 'HTTP 403' };
  }
  const listed = (result.jobPostings ?? []).some((p) =>
    (p.externalPath ?? '').includes(target.requisition)
  );
  return listed
    ? { status: 'unknown', reason: 'HTTP 403' }
    : { status: 'dead', reason: 'no longer listed by Workday' };
}

// One polite retry when a site rate-limits us, so a busy moment does not leave
// a posting unchecked for a week.
async function fetchWithRetry(
  fetchFn: FetchFn,
  url: string,
  init: Record<string, unknown>,
): Promise<Awaited<ReturnType<FetchFn>>> {
  const response = await fetchFn(url, init);
  if (response.status !== 429) return response;
  await new Promise((resolve) => setTimeout(resolve, 4000));
  return fetchFn(url, init);
}

// Oracle Recruiting Cloud careers pages (Stanford and others) are JavaScript apps
// that answer 200 for any job id, closed or invented, so the page proves nothing.
// The public REST service behind them returns no item for a requisition that is
// gone, so ask it instead. Page address:
//   https://<host>/hcmUI/CandidateExperience/<lang>/sites/<site>/job/<id>
export function oracleDetailUrl(url: string): string | null {
  const match = url.match(
    /^(https:\/\/[^/]+)\/hcmUI\/CandidateExperience\/(?:[a-z]{2}(?:-[A-Za-z]{2})?\/)?sites\/([^/]+)\/job\/([A-Za-z0-9_-]+)/,
  );
  if (!match) return null;
  const [, origin, site, id] = match;
  return `${origin}/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails` +
    `?expand=all&onlyData=true&finder=ById;Id=%22${id}%22,siteNumber=${site}`;
}

export function classifyOracle(
  status: number,
  json: unknown,
  now: Date = new Date(),
): LinkCheck {
  if (status === 404 || status === 410) {
    return { status: 'dead', reason: `HTTP ${status}` };
  }
  if (status !== 200) return { status: 'unknown', reason: `HTTP ${status}` };

  const items = (json as { items?: unknown } | null)?.items;
  if (!Array.isArray(items)) {
    return { status: 'unknown', reason: 'no posting data returned' };
  }
  if (items.length === 0) {
    return { status: 'dead', reason: 'no longer listed by Oracle Recruiting' };
  }

  const end = (items[0] as { ExternalPostedEndDate?: string }).ExternalPostedEndDate;
  if (end) {
    const date = new Date(end);
    if (!Number.isNaN(date.getTime()) && date.getTime() < now.getTime()) {
      return {
        status: 'closed',
        reason: `posting period ended (${date.toISOString().slice(0, 10)})`,
      };
    }
  }
  return { status: 'live', reason: 'ok' };
}

export type LinkAction = 'delete' | 'hide' | 'record';

/**
 * What the link check does with a job whose page was checked.
 *  - Not gone: only record the result.
 *  - Published and gone: hide it (reversible; the purge deletes it 3 days later).
 *  - Imported, pending or rejected, and gone: delete it. Nobody posted it.
 *  - A person's own submission that is gone: keep it and record the result. A typo
 *    in the link or a page that is not live yet should not make a posting vanish
 *    without the poster or an admin knowing.
 */
export function linkCheckAction(
  job: { approval_status: string | null; is_auto_imported: boolean | null },
  status: LinkStatus,
): LinkAction {
  if (status !== 'dead' && status !== 'closed') return 'record';
  if (job.approval_status === 'approved') return 'hide';
  const queued = job.approval_status === 'pending' || job.approval_status === 'rejected';
  return queued && job.is_auto_imported === true ? 'delete' : 'record';
}

export async function checkListing(
  url: string,
  fetchFn: FetchFn = fetch as unknown as FetchFn,
  now: Date = new Date(),
): Promise<LinkCheck> {
  try {
    const workday = workdayJsonUrl(url);
    if (workday) {
      const response = await fetchFn(workday, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (response.status === 403) return await workdayRemoved(workday, fetchFn);
      let json: unknown = null;
      if (response.status === 200) {
        try {
          json = await response.json();
        } catch {
          return { status: 'unknown', reason: 'unreadable response' };
        }
      }
      return classifyWorkday(response.status, json);
    }

    const oracle = oracleDetailUrl(url);
    if (oracle) {
      const response = await fetchFn(oracle, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      let json: unknown = null;
      if (response.status === 200) {
        try {
          json = await response.json();
        } catch {
          return { status: 'unknown', reason: 'unreadable response' };
        }
      }
      return classifyOracle(response.status, json, now);
    }

    const response = await fetchWithRetry(fetchFn, url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    const body = response.status === 200 ? await response.text() : '';
    return classifyPage({
      requestedUrl: url,
      finalUrl: response.url || url,
      status: response.status,
      body,
      now,
    });
  } catch (error) {
    // Network errors and timeouts say nothing about the posting itself.
    return {
      status: 'unknown',
      reason: error instanceof Error ? error.name : 'request failed',
    };
  }
}
