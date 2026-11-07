import { describe, it, expect, vi } from 'vitest';
import {
  checkListing,
  classifyPage,
  classifyWorkday,
  workdayJsonUrl,
  workdaySearchTarget,
  linkCheckAction,
  oracleDetailUrl,
  classifyOracle,
} from '../../supabase/functions/_shared/liveness';

const now = new Date('2026-10-26T00:00:00Z');
const base = {
  requestedUrl: 'https://jobrxiv.org/job/some-role/',
  finalUrl: 'https://jobrxiv.org/job/some-role/',
  status: 200,
  now,
};
const page = (body: string, over = {}) => classifyPage({ ...base, body, ...over });
const ld = (extra: string) =>
  `<script type="application/ld+json">{"@type":"JobPosting"${extra}}</script>`;

describe('classifyPage', () => {
  it('calls an ordinary page live', () => {
    expect(page('<h1>Postdoc</h1><p>Apply now</p>').status).toBe('live');
  });

  it('does not treat the word "expired" in CSS or scripts as closed', () => {
    const body = `<style>/* do not allow relisting expired listings */</style>
      <script>var msg = "session expired";</script><p>Open role</p>`;
    expect(page(body).status).toBe('live');
  });

  it.each([404, 410])('flags HTTP %i as dead', (status) => {
    expect(page('', { status }).status).toBe('dead');
  });

  it.each([403, 429, 500, 503])('never acts on HTTP %i (unknown)', (status) => {
    expect(page('', { status }).status).toBe('unknown');
  });

  it('flags a redirect to the homepage as dead', () => {
    expect(page('<p>Welcome</p>', { finalUrl: 'https://jobrxiv.org/' }).status)
      .toBe('dead');
  });

  it('does not flag a redirect to another job page', () => {
    expect(
      page('<p>ok</p>', { finalUrl: 'https://jobrxiv.org/job/renamed/' }).status,
    ).toBe('live');
  });

  it('flags a past validThrough as closed', () => {
    const r = page(ld(',"validThrough":"2026-09-01T00:00:00Z"'));
    expect(r.status).toBe('closed');
    expect(r.reason).toContain('2026-09-01');
  });

  it('keeps a future validThrough live', () => {
    expect(page(ld(',"validThrough":"2026-12-01"')).status).toBe('live');
  });

  it('flags explicit closed notices in visible text', () => {
    expect(page('<div>This position has been filled.</div>').status).toBe('closed');
    expect(page('<p>No longer accepting applications</p>').status).toBe('closed');
  });
});

describe('soft 404 pages', () => {
  it.each([
    'This job was removed by the employer.',
    'The position is no longer open.',
    'Sorry, the job could not be found.',
    'The page you are looking for does not exist.',
  ])('flags "%s" as closed', (text) => {
    expect(page(`<h1>Careers</h1><p>${text}</p>`).status).toBe('closed');
  });

  it('does not flag ordinary posting text that mentions availability', () => {
    const text = 'Visa sponsorship is not available for this position. Relocation benefits are not available.';
    expect(page(`<h1>Lecturer</h1><p>${text}</p>`).status).toBe('live');
  });

  it('does not call a blank JavaScript shell live', () => {
    const shell = '<html><head><script src="app.js"></script></head><body><div id="root"></div></body></html>';
    expect(page(shell).status).toBe('unknown');
  });
});

describe('workday', () => {
  const url =
    'https://cornell.wd1.myworkdayjobs.com/CornellCareerPage/job/Ithaca-Main-Campus/PSiX-Program-Aide_WDR-1';

  it('builds the JSON endpoint from a page URL', () => {
    expect(workdayJsonUrl(url)).toBe(
      'https://cornell.wd1.myworkdayjobs.com/wday/cxs/cornell/CornellCareerPage/job/Ithaca-Main-Campus/PSiX-Program-Aide_WDR-1',
    );
  });

  it('handles a locale segment and ignores non-Workday URLs', () => {
    expect(
      workdayJsonUrl('https://x.wd5.myworkdayjobs.com/en-US/site/job/a/b'),
    ).toBe('https://x.wd5.myworkdayjobs.com/wday/cxs/x/site/job/a/b');
    expect(workdayJsonUrl('https://example.com/job/1')).toBeNull();
  });

  it('builds the JSON endpoint for myworkdaysite.com links (tenant in the path)', () => {
    expect(
      workdayJsonUrl('https://wd5.myworkdaysite.com/recruiting/uw/UWHires/job/Seattle-WA/Manager_REQ-0000133338'),
    ).toBe('https://wd5.myworkdaysite.com/wday/cxs/uw/UWHires/job/Seattle-WA/Manager_REQ-0000133338');
  });

  it('finds the search endpoint and requisition for a job JSON url', () => {
    expect(
      workdaySearchTarget('https://osu.wd1.myworkdayjobs.com/wday/cxs/osu/OSUCareers/job/Loc/Role-Name_R157181-1'),
    ).toEqual({
      searchUrl: 'https://osu.wd1.myworkdayjobs.com/wday/cxs/osu/OSUCareers/jobs',
      requisition: 'R157181-1',
    });
    expect(workdaySearchTarget('https://example.com/x')).toBeNull();
  });

  it('classifies by status and canApply', () => {
    expect(classifyWorkday(404, null).status).toBe('dead');
    expect(classifyWorkday(403, null).status).toBe('unknown');
    expect(classifyWorkday(200, { jobPostingInfo: { canApply: true } }).status).toBe('live');
    expect(classifyWorkday(200, { jobPostingInfo: { canApply: false } }).status).toBe('closed');
    expect(classifyWorkday(200, {}).status).toBe('unknown');
  });
});

describe('checkListing', () => {
  const fakeFetch = (status: number, finalUrl: string, body = '') =>
    () => Promise.resolve({
      status,
      url: finalUrl,
      text: () => Promise.resolve(body),
      json: () => Promise.resolve({}),
    });

  it('returns unknown, not dead, when the request throws', async () => {
    const r = await checkListing(
      'https://jobrxiv.org/job/x/',
      () => Promise.reject(new Error('boom')),
    );
    expect(r.status).toBe('unknown');
  });

  it('classifies a fetched page', async () => {
    const r = await checkListing(
      'https://jobrxiv.org/job/x/',
      fakeFetch(200, 'https://jobrxiv.org/'),
      now,
    );
    expect(r.status).toBe('dead');
  });
});

describe('checkListing: Workday 403 and rate limits', () => {
  const wdUrl = 'https://osu.wd1.myworkdayjobs.com/OSUCareers/job/Loc/Role-Name_R157181-1';
  const res = (status: number, json: unknown = {}, text = '') => ({
    status,
    url: wdUrl,
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(json),
  });

  it('calls a 403 dead when the tenant search no longer lists the job', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(res(403))
      .mockResolvedValueOnce(res(200, { total: 0, jobPostings: [] }));
    const r = await checkListing(wdUrl, fetchFn, now);
    expect(r.status).toBe('dead');
    expect(fetchFn.mock.calls[1][1].method).toBe('POST');
  });

  it('leaves a 403 unknown when the job is still listed (we may be blocked)', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(res(403))
      .mockResolvedValueOnce(
        res(200, { total: 1, jobPostings: [{ externalPath: '/job/Loc/Role-Name_R157181-1' }] }),
      );
    expect((await checkListing(wdUrl, fetchFn, now)).status).toBe('unknown');
  });

  it('leaves a 403 unknown when the search itself fails', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(res(403))
      .mockResolvedValueOnce(res(500));
    expect((await checkListing(wdUrl, fetchFn, now)).status).toBe('unknown');
  });

  it('retries once after a 429 and then reads the page', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(res(429))
      .mockResolvedValueOnce(res(200, {}, '<h1>Postdoc</h1><p>This listing has expired.</p>'));
    const pending = checkListing('https://jobrxiv.org/job/x/', fetchFn, now);
    await vi.advanceTimersByTimeAsync(5000);
    const r = await pending;
    vi.useRealTimers();
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(r.status).toBe('closed');
  });

  it('stays unknown if the site is still rate limiting after the retry', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn().mockResolvedValue(res(429));
    const pending = checkListing('https://jobrxiv.org/job/x/', fetchFn, now);
    await vi.advanceTimersByTimeAsync(5000);
    const r = await pending;
    vi.useRealTimers();
    expect(r.status).toBe('unknown');
  });
});

describe('linkCheckAction', () => {
  const imported = { is_auto_imported: true };
  const byPerson = { is_auto_imported: false };

  it.each(['dead', 'closed'] as const)('deletes an imported pending or rejected job that is %s', (status) => {
    expect(linkCheckAction({ approval_status: 'pending', ...imported }, status)).toBe('delete');
    expect(linkCheckAction({ approval_status: 'rejected', ...imported }, status)).toBe('delete');
  });

  it.each(['dead', 'closed'] as const)('keeps a person\'s own pending or rejected submission that is %s', (status) => {
    expect(linkCheckAction({ approval_status: 'pending', ...byPerson }, status)).toBe('record');
    expect(linkCheckAction({ approval_status: 'rejected', ...byPerson }, status)).toBe('record');
    expect(linkCheckAction({ approval_status: 'draft', ...byPerson }, status)).toBe('record');
  });

  it.each(['dead', 'closed'] as const)('hides a published job that is %s, whoever posted it', (status) => {
    expect(linkCheckAction({ approval_status: 'approved', ...imported }, status)).toBe('hide');
    expect(linkCheckAction({ approval_status: 'approved', ...byPerson }, status)).toBe('hide');
  });

  it.each(['live', 'unknown'] as const)('only records a %s result', (status) => {
    expect(linkCheckAction({ approval_status: 'pending', ...imported }, status)).toBe('record');
    expect(linkCheckAction({ approval_status: 'approved', ...imported }, status)).toBe('record');
  });

  it('treats a missing flag as not imported', () => {
    expect(linkCheckAction({ approval_status: 'pending', is_auto_imported: null }, 'dead')).toBe('record');
  });
});

describe('Oracle Recruiting links', () => {
  const page = 'https://careersearch.stanford.edu/hcmUI/CandidateExperience/en/sites/stanford/job/200340';
  const res = (status: number, json: unknown = {}) => ({
    status,
    url: page,
    text: () => Promise.resolve(''),
    json: () => Promise.resolve(json),
  });

  it('maps a careers page address to the REST detail address', () => {
    expect(oracleDetailUrl(page)).toBe(
      'https://careersearch.stanford.edu/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails' +
        '?expand=all&onlyData=true&finder=ById;Id=%22200340%22,siteNumber=stanford',
    );
  });

  it('handles a language segment like en-GB and ignores other addresses', () => {
    expect(oracleDetailUrl('https://x.example/hcmUI/CandidateExperience/en-GB/sites/CX_1/job/55'))
      .toContain('siteNumber=CX_1');
    expect(oracleDetailUrl('https://example.com/jobs/1')).toBeNull();
  });

  it('calls a requisition the service no longer lists dead', () => {
    expect(classifyOracle(200, { items: [] }).status).toBe('dead');
    expect(classifyOracle(404, null).status).toBe('dead');
  });

  it('calls a listed requisition live, and one past its posting end date closed', () => {
    const now = new Date('2026-11-07T00:00:00Z');
    expect(classifyOracle(200, { items: [{ ExternalPostedEndDate: '2026-12-31T08:00:00+00:00' }] }, now).status).toBe('live');
    expect(classifyOracle(200, { items: [{ ExternalPostedEndDate: '2026-10-01T08:00:00+00:00' }] }, now).status).toBe('closed');
    expect(classifyOracle(200, { items: [{}] }, now).status).toBe('live');
  });

  it('never acts on a failed or odd response', () => {
    expect(classifyOracle(503, null).status).toBe('unknown');
    expect(classifyOracle(403, null).status).toBe('unknown');
    expect(classifyOracle(200, {}).status).toBe('unknown');
  });

  it('checkListing uses the REST service, so a made-up job is not called live', async () => {
    const fetchFn = vi.fn().mockResolvedValue(res(200, { items: [] }));
    const r = await checkListing(page, fetchFn, now);
    expect(r.status).toBe('dead');
    expect(String(fetchFn.mock.calls[0][0])).toContain('/hcmRestApi/');
  });
});
