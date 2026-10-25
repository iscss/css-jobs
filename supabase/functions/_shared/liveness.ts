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

  return { status: 'live', reason: 'ok' };
}

// Workday career pages are JavaScript apps that return 200 for anything, so
// ask the same JSON endpoint the importer uses. Page URL:
//   https://<tenant>.wdN.myworkdayjobs.com/<site>/job/<location>/<slug>
// Job JSON:
//   https://<host>/wday/cxs/<tenant>/<site>/job/<location>/<slug>
export function workdayJsonUrl(url: string): string | null {
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

    const response = await fetchFn(url, {
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
