import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  jobRxivAdapter,
  genericRssAdapter,
  comsesAdapter,
  workdayAdapter,
  oracleRecruitingAdapter,
} from '../../supabase/functions/_shared/adapters.ts';

// A trimmed copy of a real jobRxiv item, including the CDATA wrapping and the
// job_listing:* fields the adapter depends on.
const JOBRXIV_FEED = `<?xml version="1.0"?>
<rss version="2.0">
<channel>
  <item>
    <title>Postdoctoral Fellow in Computational Social Science</title>
    <link>https://jobrxiv.org/job/example-1/</link>
    <dc:creator><![CDATA[Some Poster]]></dc:creator>
    <pubDate>Mon, 03 Aug 2026 20:18:07 +0000</pubDate>
    <guid isPermaLink="false">https://jobrxiv.org/job/example-1/</guid>
    <description><![CDATA[Short summary]]></description>
    <content:encoded><![CDATA[<p>Full description with <strong>markup</strong>.</p>]]></content:encoded>
    <job_listing:location>Oxford, UK</job_listing:location>
    <job_listing:job_type>Postdoc</job_listing:job_type>
    <job_listing:company><![CDATA[University of Oxford]]></job_listing:company>
  </item>
  <item>
    <title>PhD Position</title>
    <link>https://jobrxiv.org/job/example-2/</link>
    <content:encoded><![CDATA[<p>Another role.</p>]]></content:encoded>
    <job_listing:company>Aarhus University</job_listing:company>
  </item>
</channel>
</rss>`;

function mockFetch(body: string, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    text: () => Promise.resolve(body),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('jobRxivAdapter', () => {
  it('extracts every item with its structured fields', async () => {
    vi.stubGlobal('fetch', mockFetch(JOBRXIV_FEED));

    const jobs = await jobRxivAdapter('https://jobrxiv.org/?feed=job_feed', {});

    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      title: 'Postdoctoral Fellow in Computational Social Science',
      institution: 'University of Oxford',
      location: 'Oxford, UK',
      jobType: 'Postdoc',
      sourceUrl: 'https://jobrxiv.org/job/example-1/',
    });
  });

  it('unwraps CDATA rather than leaking the wrapper into the data', async () => {
    vi.stubGlobal('fetch', mockFetch(JOBRXIV_FEED));

    const jobs = await jobRxivAdapter('https://jobrxiv.org/?feed=job_feed', {});

    expect(jobs[0].institution).toBe('University of Oxford');
    expect(jobs[0].description).not.toContain('CDATA');
    expect(jobs[0].description).toContain('Full description');
  });

  it('prefers the full content:encoded body over the short description', async () => {
    vi.stubGlobal('fetch', mockFetch(JOBRXIV_FEED));

    const jobs = await jobRxivAdapter('https://jobrxiv.org/?feed=job_feed', {});

    expect(jobs[0].description).toContain('Full description');
    expect(jobs[0].description).not.toBe('Short summary');
  });

  it('requests the configured page size', async () => {
    const fetchMock = mockFetch(JOBRXIV_FEED);
    vi.stubGlobal('fetch', fetchMock);

    await jobRxivAdapter('https://jobrxiv.org/?feed=job_feed', {
      posts_per_page: 100,
    });

    expect(fetchMock.mock.calls[0][0]).toContain('posts_per_page=100');
  });

  it('falls back to a default location when the feed omits one', async () => {
    vi.stubGlobal('fetch', mockFetch(JOBRXIV_FEED));

    const jobs = await jobRxivAdapter('https://jobrxiv.org/?feed=job_feed', {});

    expect(jobs[1].location).toBe('Not specified');
  });

  it('drops items missing a title or link instead of emitting junk', async () => {
    vi.stubGlobal('fetch', mockFetch(`<rss><channel>
      <item><title>No link here</title></item>
      <item><link>https://example.org/no-title</link></item>
      <item><title>Good</title><link>https://example.org/good</link></item>
    </channel></rss>`));

    const jobs = await jobRxivAdapter('https://example.org/feed', {});

    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe('Good');
  });

  it('treats a bot-protection page as a failure, not an empty feed', async () => {
    // HigherEdJobs returns HTTP 200 with an Incapsula HTML body. Parsing that
    // as RSS would silently report "0 jobs fetched" and look like success.
    vi.stubGlobal('fetch', mockFetch('<html><body>Request unsuccessful.</body></html>'));

    await expect(
      jobRxivAdapter('https://www.higheredjobs.com/rss/', {}),
    ).rejects.toThrow(/bot protection|did not return RSS/i);
  });

  it('surfaces a non-OK HTTP status', async () => {
    vi.stubGlobal('fetch', mockFetch('', false, 503));

    await expect(
      jobRxivAdapter('https://jobrxiv.org/?feed=job_feed', {}),
    ).rejects.toThrow(/503/);
  });
});

describe('comsesAdapter', () => {
  const feed = `<rss><channel>
    <item>
      <title>Postdoc fellow on ABM &amp; Networks, University of Milano-Bicocca</title>
      <link>https://www.comses.net/jobs/661/</link>
      <dc:creator>pablolucas</dc:creator>
      <description>Agent-based modelling of social networks.</description>
    </item>
    <item>
      <title>Research Associate</title>
      <link>https://www.comses.net/jobs/662/</link>
      <dc:creator>sawendel</dc:creator>
      <description>A post at Northwestern University studying collective behaviour.</description>
    </item>
    <item>
      <title>Analyst</title>
      <link>https://www.comses.net/jobs/663/</link>
      <dc:creator>someuser</dc:creator>
      <description>No institution named anywhere in this text.</description>
    </item>
  </channel></rss>`;

  it('recovers the institution from the title', async () => {
    vi.stubGlobal('fetch', mockFetch(feed));
    const jobs = await comsesAdapter('https://www.comses.net/feeds/jobs/rss/', {});
    expect(jobs[0].institution).toBe('University of Milano-Bicocca');
  });

  it('recovers the institution from the description when absent from the title', async () => {
    vi.stubGlobal('fetch', mockFetch(feed));
    const jobs = await comsesAdapter('https://www.comses.net/feeds/jobs/rss/', {});
    expect(jobs[1].institution).toBe('Northwestern University');
  });

  it('never falls back to the submitter username', async () => {
    // dc:creator is a CoMSES account name, not an employer — using it would
    // attribute jobs to people like "someuser".
    vi.stubGlobal('fetch', mockFetch(feed));
    const jobs = await comsesAdapter('https://www.comses.net/feeds/jobs/rss/', {});
    const institutions = jobs.map((j) => j.institution);
    expect(institutions).not.toContain('someuser');
    expect(institutions).not.toContain('pablolucas');
    expect(jobs[2].institution).toBe('CoMSES Net');
  });
});

describe('workdayAdapter', () => {
  const SEARCH = 'https://x.wd5.myworkdayjobs.com/wday/cxs/x/X/jobs';

  // Workday needs two calls per job: a search page, then a per-job detail
  // fetch for the description. This routes each by URL shape.
  function mockWorkday(
    pages: Record<string, unknown>[],
    detail: Record<string, unknown> | null,
  ) {
    let pageIndex = 0;
    return vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        const body = pages[Math.min(pageIndex, pages.length - 1)];
        pageIndex++;
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
      }
      if (!detail) return Promise.resolve({ ok: false, status: 404 });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(detail) });
    });
  }

  const detail = {
    jobPostingInfo: {
      title: 'Postdoc in Computational Social Science',
      jobDescription: '<p>Agent-based modelling of collective behaviour.</p>',
      location: 'Pittsburgh, PA',
      externalUrl: 'https://x.wd5.myworkdayjobs.com/X/job/abc_123',
      jobReqId: 'REQ123',
      startDate: '2026-07-28',
    },
  };

  it('maps a posting through search plus detail fetch', async () => {
    vi.stubGlobal('fetch', mockWorkday(
      [{ jobPostings: [{ title: 'Postdoc', externalPath: '/job/abc_123' }] }],
      detail,
    ));

    const jobs = await workdayAdapter(SEARCH, {
      institution: 'Carnegie Mellon University',
      search_terms: ['computational social science'],
    });

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      title: 'Postdoc in Computational Social Science',
      institution: 'Carnegie Mellon University',
      location: 'Pittsburgh, PA',
      sourceUrl: 'https://x.wd5.myworkdayjobs.com/X/job/abc_123',
      sourceJobId: 'REQ123',
    });
  });

  it('sends the configured search term to the server', async () => {
    const fetchMock = mockWorkday([{ jobPostings: [] }], detail);
    vi.stubGlobal('fetch', fetchMock);

    await workdayAdapter(SEARCH, {
      institution: 'Test University',
      search_terms: ['computational sociology'],
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.searchText).toBe('computational sociology');
    expect(body.limit).toBe(20); // Workday caps page size at 20
  });

  it('deduplicates a job matched by several search terms', async () => {
    // The same posting legitimately matches multiple terms; fetching its
    // detail twice would double the request count and the row count.
    vi.stubGlobal('fetch', mockWorkday(
      [{ jobPostings: [{ title: 'Postdoc', externalPath: '/job/abc_123' }] }],
      detail,
    ));

    const jobs = await workdayAdapter(SEARCH, {
      institution: 'Test University',
      search_terms: ['computational social science', 'social data science'],
    });

    expect(jobs).toHaveLength(1);
  });

  it('skips a job whose detail fetch fails rather than failing the run', async () => {
    vi.stubGlobal('fetch', mockWorkday(
      [{ jobPostings: [{ title: 'Postdoc', externalPath: '/job/gone' }] }],
      null,
    ));

    const jobs = await workdayAdapter(SEARCH, {
      institution: 'Test University',
      search_terms: ['computational social science'],
    });

    expect(jobs).toEqual([]);
  });

  it('requires an institution, since Workday never returns one', async () => {
    vi.stubGlobal('fetch', mockWorkday([{ jobPostings: [] }], detail));
    await expect(workdayAdapter(SEARCH, {})).rejects.toThrow(/institution/);
  });

  it('surfaces a non-OK search response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(
      workdayAdapter(SEARCH, { institution: 'Test University' }),
    ).rejects.toThrow(/503/);
  });
});

describe('genericRssAdapter', () => {
  it('fills institution and location from source config', async () => {
    vi.stubGlobal('fetch', mockFetch(`<rss><channel>
      <item>
        <title>Research Associate</title>
        <link>https://stanford.edu/jobs/1</link>
        <description>A role in the department.</description>
      </item>
    </channel></rss>`));

    const jobs = await genericRssAdapter('https://stanford.edu/jobs/feed', {
      institution: 'Stanford University',
      location: 'Stanford, CA',
    });

    expect(jobs[0]).toMatchObject({
      institution: 'Stanford University',
      location: 'Stanford, CA',
    });
  });
});

describe('a careers site that answers with a web page instead of JSON', () => {
  // Workday's maintenance redirect and bot-check pages are HTML. The run log
  // has to say so, not "Unexpected token <".
  const html = () =>
    vi.fn().mockResolvedValue(
      new Response('<!DOCTYPE html><html>maintenance</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    );

  it('names the problem for Workday', async () => {
    vi.stubGlobal('fetch', html());
    await expect(
      workdayAdapter('https://x.wd5.myworkdayjobs.com/wday/cxs/x/X/jobs', { institution: 'X' }),
    ).rejects.toThrow(/did not return JSON.*text\/html.*maintenance/);
  });

  it('names the problem for Oracle Recruiting', async () => {
    vi.stubGlobal('fetch', html());
    await expect(
      oracleRecruitingAdapter('https://careers.example.edu', { institution: 'X', site_number: 's' }),
    ).rejects.toThrow(/did not return JSON/);
  });
});

describe('oracleRecruitingAdapter', () => {
  const BASE = 'https://careers.example.edu';
  const config = { institution: 'Example University', site_number: 'example' };

  const detail = (over: Record<string, unknown> = {}) => ({
    items: [{
      Id: '201567',
      Title: 'Postdoctoral Scholar in Computational Social Science',
      ExternalDescriptionStr: '<p>Agent-based models of collective behaviour.</p>',
      ExternalResponsibilitiesStr: '<ul><li>Run experiments</li></ul>',
      ExternalQualificationsStr: '<p>PhD in sociology or computer science.</p>',
      ExternalPostedStartDate: '2026-10-29T17:54:45+00:00',
      PrimaryLocation: 'Stanford, CA, United States',
      ...over,
    }],
  });

  const list = (ids: string[], total = ids.length) => ({
    items: [{
      TotalJobsCount: total,
      requisitionList: ids.map((Id) => ({ Id, Title: `Job ${Id}` })),
    }],
  });

  // Routes the list call and the per-job detail call by URL.
  function mockOracle(
    pages: Record<string, unknown>[],
    details: Record<string, Record<string, unknown> | null>,
  ) {
    let page = 0;
    return vi.fn().mockImplementation((url: string) => {
      if (url.includes('recruitingCEJobRequisitionDetails')) {
        const id = /Id=%22([^%]+)%22/.exec(url)?.[1] ?? '';
        const body = details[id];
        return Promise.resolve(
          body ? { ok: true, status: 200, json: () => Promise.resolve(body) } : { ok: false, status: 404 },
        );
      }
      const body = pages[Math.min(page, pages.length - 1)];
      page++;
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
    });
  }

  it('maps a requisition through list plus detail, joining description, duties and qualifications', async () => {
    vi.stubGlobal('fetch', mockOracle([list(['201567'])], { '201567': detail() }));

    const jobs = await oracleRecruitingAdapter(BASE, config);

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      title: 'Postdoctoral Scholar in Computational Social Science',
      institution: 'Example University',
      location: 'Stanford, CA, United States',
      sourceUrl: 'https://careers.example.edu/hcmUI/CandidateExperience/en/sites/example/job/201567',
      sourceJobId: '201567',
      postedAt: '2026-10-29T17:54:45+00:00',
    });
    expect(jobs[0].description).toContain('Agent-based models');
    expect(jobs[0].description).toContain('Run experiments');
    expect(jobs[0].description).toContain('PhD in sociology');
  });

  it('sends the site number and the search term to the server', async () => {
    const fetchMock = mockOracle([list([])], {});
    vi.stubGlobal('fetch', fetchMock);

    await oracleRecruitingAdapter(BASE, { ...config, search_terms: ['network analysis'] });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/hcmRestApi/resources/latest/recruitingCEJobRequisitions');
    expect(url).toContain('siteNumber=example');
    expect(url).toContain('keyword=%22network%20analysis%22');
  });

  it('fetches a job matched by several terms only once', async () => {
    const fetchMock = mockOracle([list(['1']), list(['1'])], { '1': detail({ Id: '1' }) });
    vi.stubGlobal('fetch', fetchMock);

    const jobs = await oracleRecruitingAdapter(BASE, { ...config, search_terms: ['a', 'b'] });

    expect(jobs).toHaveLength(1);
    const detailCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes('Details'));
    expect(detailCalls).toHaveLength(1);
  });

  it('pages through results until a short page', async () => {
    const full = Array.from({ length: 25 }, (_, i) => String(i + 1));
    const fetchMock = mockOracle([list(full, 26), list(['26'], 26)], {});
    vi.stubGlobal('fetch', fetchMock);

    await oracleRecruitingAdapter(BASE, { ...config, max_per_term: 50 });

    const listCalls = fetchMock.mock.calls.filter(([u]) => !String(u).includes('Details'));
    expect(listCalls).toHaveLength(2);
    expect(String(listCalls[1][0])).toContain('offset=25');
  });

  it('skips a job whose detail fetch fails rather than failing the run', async () => {
    vi.stubGlobal('fetch', mockOracle([list(['1', '2'])], { '1': null, '2': detail({ Id: '2' }) }));

    const jobs = await oracleRecruitingAdapter(BASE, config);

    expect(jobs.map((j) => j.sourceJobId)).toEqual(['2']);
  });

  it('skips a requisition with no description', async () => {
    vi.stubGlobal('fetch', mockOracle([list(['1'])], {
      '1': detail({ ExternalDescriptionStr: '', ExternalResponsibilitiesStr: '', ExternalQualificationsStr: '' }),
    }));
    expect(await oracleRecruitingAdapter(BASE, config)).toEqual([]);
  });

  it('requires an institution and a site number', async () => {
    await expect(oracleRecruitingAdapter(BASE, { site_number: 'example' })).rejects.toThrow(/institution/);
    await expect(oracleRecruitingAdapter(BASE, { institution: 'X' })).rejects.toThrow(/site_number/);
  });

  it('surfaces a non-OK list response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(oracleRecruitingAdapter(BASE, config)).rejects.toThrow(/503/);
  });
});
