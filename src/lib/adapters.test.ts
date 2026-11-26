import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  csvSheetAdapter,
  parseCsv,
  smartRecruitersAdapter,
  peopleAdminAdapter,
  successFactorsAdapter,
  successFactorsDescription,
  successFactorsTitleFromUrl,
  ucRecruitAdapter,
  ucRows,
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

describe('parseCsv', () => {
  it('reads quoted cells, doubled quotes and newlines inside quotes', () => {
    const rows = parseCsv('a,"b, with comma","say ""hi"""\n"line\nbreak",x,y\n');
    expect(rows).toEqual([
      ['a', 'b, with comma', 'say "hi"'],
      ['line\nbreak', 'x', 'y'],
    ]);
  });

  it('copes with Windows line endings and no trailing newline', () => {
    expect(parseCsv('a,b\r\nc,d')).toEqual([['a', 'b'], ['c', 'd']]);
  });
});

describe('csvSheetAdapter', () => {
  const URL_ = 'https://docs.google.com/spreadsheets/d/e/X/pub?output=csv';
  const HEAD =
    'Institution / department,Position / announcement,Brief description,Stated deadline / review date,Date guidance,Application / details,Notes';
  const csv = (...lines: string[]) =>
    ['Hiring list,,,,,,', ',,,,,,', HEAD, ...lines].join('\n');
  const mock = (body: string, status = 200) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status })));

  it('maps a row, splits the institution from its department, and finds the heading row', async () => {
    mock(csv('Aarhus University — Computer Science,Assistant Professor,"Open area, including NLP and computational social science",2027-01-18 — deadline,Upcoming deadline,https://cs.au.dk/job/1,Checked Nov 25'));
    const jobs = await csvSheetAdapter(URL_, {});
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      title: 'Assistant Professor',
      institution: 'Aarhus University',
      location: 'See posting',
      sourceUrl: 'https://cs.au.dk/job/1',
      applicationUrl: 'https://cs.au.dk/job/1',
    });
    expect(jobs[0].description).toContain('(Computer Science)');
    expect(jobs[0].description).toContain('Open area, including NLP');
  });

  it('turns only a clearly upcoming deadline into a closing date', async () => {
    mock(csv(
      'A University — X,Prof A,Some research role in the field of study,2027-01-18 — deadline,Upcoming deadline,https://a.edu/1,',
      'B University — Y,Prof B,Another research role in the field of study,2026-10-29 — initial deadline; rolling,Rolling / later applications possible,https://b.edu/2,',
    ));
    const [a, b] = await csvSheetAdapter(URL_, {});
    expect(a.description).toContain('Application deadline: 2027-01-18');
    expect(b.description).not.toContain('Application deadline:');
  });

  it('skips rows the sheet itself marks as over', async () => {
    mock(csv(
      'A University — X,Prof A,Some research role in the field of study,2026-01-01,Stated deadline passed,https://a.edu/1,',
      'B University — Y,Prof B,Another research role in the field of study,,Portal closed,https://b.edu/2,',
      'C University — Z,Prof C,Third research role in the field of study,,Employer posting unavailable,https://c.edu/3,',
      'D University — W,Prof D,Fourth research role in the field of study,,Rolling / later applications possible,https://d.edu/4,',
    ));
    const jobs = await csvSheetAdapter(URL_, {});
    expect(jobs.map((j) => j.institution)).toEqual(['D University']);
  });

  it('skips a row with no link or no title', async () => {
    mock(csv(
      'A University — X,,Role without a title but a long enough description,,,https://a.edu/1,',
      'B University — Y,Prof B,Role without a link but a long enough description,,,,',
    ));
    expect(await csvSheetAdapter(URL_, {})).toEqual([]);
  });

  it('says so when the sheet is not published as CSV', async () => {
    mock('<!DOCTYPE html><html>sign in</html>');
    await expect(csvSheetAdapter(URL_, {})).rejects.toThrow(/did not return CSV/);
  });

  it('surfaces a non-OK reply and a sheet without the expected columns', async () => {
    mock('nope', 404);
    await expect(csvSheetAdapter(URL_, {})).rejects.toThrow(/404/);
    mock('foo,bar\n1,2\n');
    await expect(csvSheetAdapter(URL_, {})).rejects.toThrow(/heading row/);
  });
});

describe('smartRecruitersAdapter', () => {
  const BASE = 'https://api.smartrecruiters.com/v1/companies/ExampleUni/postings';
  const json = (body: unknown, status = 200) =>
    Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

  const detail = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    name: `Role ${id}`,
    postingUrl: `https://jobs.smartrecruiters.com/ExampleUni/${id}-role`,
    applyUrl: `https://jobs.smartrecruiters.com/ExampleUni/${id}-role?oga=true`,
    releasedDate: '2026-11-24T10:00:00.000Z',
    location: { fullLocation: 'Notre Dame, IN, United States' },
    jobAd: { sections: { jobDescription: { text: '<p>Study social networks computationally.</p>' }, qualifications: { text: '<p>PhD required.</p>' } } },
    ...extra,
  });

  function mock(handler: (url: string) => Promise<Response>) {
    const fn = vi.fn((url: string) => handler(url));
    vi.stubGlobal('fetch', fn);
    return fn;
  }

  it('maps a posting from the list plus the detail', async () => {
    mock((url) => {
      if (url.includes('/postings/')) return json(detail('111'));
      return json({ content: [{ id: '111', name: 'Role 111' }] });
    });
    const [job] = await smartRecruitersAdapter(BASE, { institution: 'Example University' });
    expect(job).toMatchObject({
      title: 'Role 111',
      institution: 'Example University',
      location: 'Notre Dame, IN, United States',
      sourceUrl: 'https://jobs.smartrecruiters.com/ExampleUni/111-role',
      applicationUrl: 'https://jobs.smartrecruiters.com/ExampleUni/111-role?oga=true',
      sourceJobId: '111',
      postedAt: '2026-11-24T10:00:00.000Z',
    });
    expect(job.description).toContain('Study social networks');
    expect(job.description).toContain('PhD required');
  });

  it('sends each search term and removes a posting found by two terms', async () => {
    const fn = mock((url) => {
      if (url.includes('/postings/')) return json(detail('111'));
      return json({ content: [{ id: '111', name: 'Role 111' }] });
    });
    const jobs = await smartRecruitersAdapter(BASE, {
      institution: 'X',
      search_terms: ['computational social science', 'network science'],
    });
    expect(jobs).toHaveLength(1);
    const lists = fn.mock.calls.map((c) => c[0] as string).filter((u) => !u.includes('/postings/'));
    expect(lists.some((u) => u.includes('q=computational%20social%20science'))).toBe(true);
    expect(lists.some((u) => u.includes('q=network%20science'))).toBe(true);
  });

  it('pages through a long list', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ id: `a${i}`, name: 'x' }));
    const fn = mock((url) => {
      // Only the last posting has a readable detail, which keeps this test fast.
      if (url.includes('/postings/')) return url.endsWith('/b0') ? json(detail('b0')) : json({}, 404);
      return json({ content: url.includes('offset=0') ? page1 : [{ id: 'b0', name: 'y' }] });
    });
    const jobs = await smartRecruitersAdapter(BASE, { institution: 'X', max_per_term: 150 });
    expect(jobs.map((j) => j.sourceJobId)).toEqual(['b0']);
    expect(fn.mock.calls.some((c) => (c[0] as string).includes('offset=100'))).toBe(true);
  });

  it('skips a posting whose detail is gone or has no description', async () => {
    mock((url) => {
      if (url.endsWith('/gone')) return json({}, 404);
      if (url.endsWith('/empty')) return json(detail('empty', { jobAd: { sections: {} } }));
      if (url.includes('/postings/')) return json(detail('ok'));
      return json({ content: [{ id: 'gone' }, { id: 'empty' }, { id: 'ok' }] });
    });
    const jobs = await smartRecruitersAdapter(BASE, { institution: 'X' });
    expect(jobs.map((j) => j.sourceJobId)).toEqual(['ok']);
  });

  it('needs an institution, and surfaces a non-OK reply', async () => {
    await expect(smartRecruitersAdapter(BASE, {})).rejects.toThrow(/institution/);
    mock(() => json({}, 503));
    await expect(smartRecruitersAdapter(BASE, { institution: 'X' })).rejects.toThrow(/503/);
  });
});

describe('peopleAdminAdapter', () => {
  const FEED = 'https://example.peopleadmin.com/postings/search.atom';
  const atom = (...entries: { title: string; id: string }[]) =>
    `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">${entries
      .map((e) => `<entry><title>${e.title}</title><link rel="alternate" href="https://example.peopleadmin.com/postings/${e.id}"/><updated>2026-11-25T10:00:00Z</updated></entry>`)
      .join('')}</feed>`;
  const page = (body: string) =>
    `<html><body><nav>Skip to Main Content Home Search Jobs</nav><h1>Posting Information</h1>${body}</body></html>`;
  const text = (body: string, status = 200) => Promise.resolve(new Response(body, { status }));

  function mock(handler: (url: string) => Promise<Response>) {
    const fn = vi.fn((url: string) => handler(url));
    vi.stubGlobal('fetch', fn);
    return fn;
  }

  it('maps an entry plus its page, using the text from "Posting Information" on', async () => {
    mock((url) =>
      url.includes('search.atom')
        ? text(atom({ title: 'Research Associate', id: '1' }))
        : text(page('<p>Analyse social media data with network methods for the department.</p>')),
    );
    const [job] = await peopleAdminAdapter(FEED, { institution: 'Example University' });
    expect(job).toMatchObject({
      title: 'Research Associate',
      institution: 'Example University',
      sourceUrl: 'https://example.peopleadmin.com/postings/1',
      sourceJobId: '1',
      postedAt: '2026-11-25T10:00:00Z',
    });
    expect(job.description).toContain('Analyse social media data');
    expect(job.description).not.toContain('Skip to Main Content');
  });

  it('sends each search term and removes a posting found twice', async () => {
    const fn = mock((url) =>
      url.includes('search.atom')
        ? text(atom({ title: 'Research Associate', id: '1' }))
        : text(page('<p>A long enough description of the research associate role here.</p>')),
    );
    const jobs = await peopleAdminAdapter(FEED, {
      institution: 'X',
      search_terms: ['computational social science', 'network science'],
    });
    expect(jobs).toHaveLength(1);
    const feeds = fn.mock.calls.map((c) => c[0] as string).filter((u) => u.includes('search.atom'));
    expect(feeds.some((u) => u.includes('query=computational%20social%20science'))).toBe(true);
    expect(feeds.some((u) => u.includes('query=network%20science'))).toBe(true);
  });

  it('ignores the placeholder entry a search with no results returns', async () => {
    mock(() => text(atom({ title: 'No Positions Currently Open', id: '9' })));
    expect(await peopleAdminAdapter(FEED, { institution: 'X' })).toEqual([]);
  });

  it('skips a posting whose page has gone', async () => {
    mock((url) => {
      if (url.includes('search.atom')) return text(atom({ title: 'Gone', id: '1' }, { title: 'Here', id: '2' }));
      return url.endsWith('/1') ? text('', 404) : text(page('<p>A long enough description of the role that is here.</p>'));
    });
    const jobs = await peopleAdminAdapter(FEED, { institution: 'X' });
    expect(jobs.map((j) => j.title)).toEqual(['Here']);
  });

  it('says so when the site does not return an Atom feed, and needs an institution', async () => {
    await expect(peopleAdminAdapter(FEED, {})).rejects.toThrow(/institution/);
    mock(() => text('<!DOCTYPE html><html>blocked</html>'));
    await expect(peopleAdminAdapter(FEED, { institution: 'X' })).rejects.toThrow(/Atom feed/);
    mock(() => text('nope', 503));
    await expect(peopleAdminAdapter(FEED, { institution: 'X' })).rejects.toThrow(/503/);
  });
});

describe('successFactorsAdapter', () => {
  const ROOT = 'https://careers.example.edu';
  const sitemap = (...paths: string[]) =>
    `<?xml version="1.0"?><urlset>${paths
      .map((p) => `<url><loc>${ROOT}/job/${p}/</loc></url>`)
      .join('')}</urlset>`;
  const jobPage = (o: { title?: string; body?: string; deadline?: string; city?: string } = {}) =>
    `<html><body><h1><span itemprop="title">${o.title ?? 'Postdoctoral Associate'}   </span></h1>` +
    `<span itemprop="jobLocation"><meta itemprop="addressLocality" content="${o.city ?? 'Durham'}">` +
    `<meta itemprop="addressRegion" content="NC"><meta itemprop="addressCountry" content="US"></span>` +
    `<meta itemprop="datePosted" content="Thu Oct 29 00:00:00 UTC 2026">` +
    (o.deadline ? `<meta itemprop="validThrough" content="${o.deadline}">` : '') +
    `<span itemprop="description" class="x"><span class="jobdescription">` +
    `<p>${o.body ?? 'Work on computational social science projects with network data and statistics.'}</p>` +
    `<ul><li>Apply with a CV</li></ul></span></span><div>Footer text that is not the description</div></body></html>`;
  const text = (body: string, status = 200) => Promise.resolve(new Response(body, { status }));

  function mock(handler: (url: string) => Promise<Response>) {
    const fn = vi.fn((url: string) => handler(url));
    vi.stubGlobal('fetch', fn);
    return fn;
  }

  it('reads the sitemap, opens only jobs whose title matches, and maps the page', async () => {
    const fn = mock((url) =>
      url.endsWith('sitemap.xml')
        ? text(sitemap('Durham-Postdoctoral-Associate-NC/111', 'Durham-Groundskeeper-NC/222'))
        : text(jobPage({ deadline: 'Tue Dec 01 23:00:00 UTC 2026' })),
    );
    const jobs = await successFactorsAdapter(ROOT + '/', { institution: 'Example University' });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      title: 'Postdoctoral Associate',
      institution: 'Example University',
      location: 'Durham, NC, US',
      sourceUrl: `${ROOT}/job/Durham-Postdoctoral-Associate-NC/111/`,
      sourceJobId: '111',
      postedAt: '2026-10-29T00:00:00.000Z',
    });
    expect(jobs[0].description).toContain('computational social science');
    expect(jobs[0].description).toContain('Apply with a CV');
    expect(jobs[0].description).not.toContain('Footer text');
    expect(jobs[0].description).toContain('Application deadline: 2026-12-01.');
    const pages = fn.mock.calls.map((c) => c[0] as string).filter((u) => !u.endsWith('sitemap.xml'));
    expect(pages).toHaveLength(1);
  });

  it('uses the page heading when there is no title markup, and the configured terms', async () => {
    mock((url) =>
      url.endsWith('sitemap.xml')
        ? text(sitemap('Tenure-Track-Professur-f%C3%BCr-Erkenntnistheorie/333', 'Postdoc-Chemistry/444'))
        : text(jobPage().replace(/<span itemprop="title">[^<]*<\/span>/, 'Professur für Erkenntnistheorie')),
    );
    const jobs = await successFactorsAdapter(ROOT, {
      institution: 'X',
      search_terms: ['professur'],
    });
    expect(jobs.map((j) => j.title)).toEqual(['Professur für Erkenntnistheorie']);
  });

  it('stops at max_jobs', async () => {
    mock((url) =>
      url.endsWith('sitemap.xml')
        ? text(sitemap('A-Postdoc/1', 'B-Postdoc/2', 'C-Postdoc/3'))
        : text(jobPage()),
    );
    expect(await successFactorsAdapter(ROOT, { institution: 'X', max_jobs: 1 })).toHaveLength(1);
  });

  it('skips a job whose page has gone', async () => {
    mock((url) => {
      if (url.endsWith('sitemap.xml')) return text(sitemap('Gone-Postdoc/1', 'Here-Postdoc/2'));
      return url.includes('/1/') ? text('', 404) : text(jobPage({ title: 'Here' }));
    });
    const jobs = await successFactorsAdapter(ROOT, { institution: 'X' });
    expect(jobs.map((j) => j.title)).toEqual(['Here']);
  });

  it('says so when the site does not return a sitemap, and needs an institution', async () => {
    await expect(successFactorsAdapter(ROOT, {})).rejects.toThrow(/institution/);
    mock(() => text('<!DOCTYPE html><html>blocked</html>'));
    await expect(successFactorsAdapter(ROOT, { institution: 'X' })).rejects.toThrow(/sitemap/);
    mock(() => text('nope', 503));
    await expect(successFactorsAdapter(ROOT, { institution: 'X' })).rejects.toThrow(/503/);
  });

  it('reports an error, not "no jobs", when every job page fails', async () => {
    mock((url) =>
      url.endsWith('sitemap.xml') ? text(sitemap('A-Postdoc/1', 'B-Postdoc/2')) : text('slow down', 429),
    );
    await expect(successFactorsAdapter(ROOT, { institution: 'X' })).rejects.toThrow(/none of 2 job pages.*429/);
  });

  it('returns no jobs, without an error, when nothing in the sitemap matches', async () => {
    mock(() => text(sitemap('Durham-Groundskeeper-NC/1')));
    expect(await successFactorsAdapter(ROOT, { institution: 'X' })).toEqual([]);
  });

  it('reads a title out of an address, and a description with spans inside it', () => {
    expect(successFactorsTitleFromUrl(`${ROOT}/job/Tenure-Track-Professur-f%C3%BCr-Physik/9/`)).toBe(
      'tenure track professur für physik',
    );
    expect(
      successFactorsDescription('<span itemprop="description"><span>a <span>b</span></span> c</span> after'),
    ).toBe('<span>a <span>b</span></span> c');
  });
});

describe('ucRecruitAdapter', () => {
  const FEED = 'https://recruit.example.edu/apply';
  const row = (id: string, title: string) =>
    `<tr id="${id}" class="linked match"><td class="job-number"><a href="/${id}">${id}</a></td>` +
    `<td class="name"><div class='name'>\n  ${title}\n</div></td></tr>`;
  const list = (...sections: { unit: string; rows: string[] }[]) =>
    `<html><table>${sections
      .map((sec) => `<tbody class="matches" data-section="${sec.unit}">${sec.rows.join('')}</tbody>`)
      .join('')}</table></html>`;
  const detail = (extra = '') =>
    `<html><h1>x</h1><h3>Position overview</h3><p>Position title: Lecturer</p>` +
    `<h3>Application Window</h3><p>Open date: October 24, 2026</p>` +
    `<p>Final date: Tuesday, Oct 12, 2027 at 11:59pm (Pacific Time)</p>` +
    `<h3 id="description">Position description</h3><p>Teach data science courses to undergraduates.${extra}</p>` +
    `<h3 id="requirements">Application Requirements</h3><p>Upload a CV.</p></html>`;
  const text = (body: string, status = 200) => Promise.resolve(new Response(body, { status }));

  function mock(handler: (url: string) => Promise<Response>) {
    const fn = vi.fn((url: string) => handler(url));
    vi.stubGlobal('fetch', fn);
    return fn;
  }

  it('reads each row with its title and the unit it sits under', () => {
    const rows = ucRows(
      list(
        { unit: 'School A / A', rows: [row('JPF1', 'Lecturer in Data Science')] },
        { unit: 'School B / B', rows: [row('JPF2', 'Gardener')] },
      ),
    );
    expect(rows).toEqual([
      { id: 'JPF1', title: 'Lecturer in Data Science', unit: 'School A / A' },
      { id: 'JPF2', title: 'Gardener', unit: 'School B / B' },
    ]);
  });

  it('opens only matching rows, and maps the page with dates and no requirements section', async () => {
    const fn = mock((url) =>
      url === FEED
        ? text(list(
            { unit: 'Social Sciences / SOC', rows: [row('JPF1', 'Lecturer in Sociology')] },
            { unit: 'Grounds / GRD', rows: [row('JPF2', 'Gardener')] },
          ))
        : text(detail()),
    );
    const jobs = await ucRecruitAdapter(FEED, { institution: 'UC Example' });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      title: 'Lecturer in Sociology',
      institution: 'UC Example',
      sourceUrl: 'https://recruit.example.edu/JPF1',
      sourceJobId: 'JPF1',
      postedAt: '2026-10-24',
    });
    expect(jobs[0].description).toContain('Social Sciences / SOC');
    expect(jobs[0].description).toContain('Teach data science courses');
    expect(jobs[0].description).not.toContain('Upload a CV');
    expect(jobs[0].description).toContain('Application deadline: October 12, 2027.');
    expect(fn.mock.calls.map((c) => c[0] as string)).not.toContain('https://recruit.example.edu/JPF2');
  });

  it('opens rows about data and the social sciences before the others when limited', async () => {
    mock((url) =>
      url === FEED
        ? text(list({ unit: 'U', rows: [row('JPF1', 'Lecturer in Music'), row('JPF2', 'Lecturer in Data Science')] }))
        : text(detail()),
    );
    const jobs = await ucRecruitAdapter(FEED, { institution: 'X', max_jobs: 1 });
    expect(jobs.map((j) => j.sourceJobId)).toEqual(['JPF2']);
  });

  it('skips a recruitment whose page has gone', async () => {
    mock((url) => {
      if (url === FEED) return text(list({ unit: 'U', rows: [row('JPF1', 'Lecturer A'), row('JPF2', 'Lecturer B')] }));
      return url.endsWith('JPF1') ? text('', 404) : text(detail());
    });
    const jobs = await ucRecruitAdapter(FEED, { institution: 'X' });
    expect(jobs.map((j) => j.sourceJobId)).toEqual(['JPF2']);
  });

  it('reports an error, not "no jobs", when every recruitment page fails', async () => {
    mock((url) =>
      url === FEED ? text(list({ unit: 'U', rows: [row('JPF1', 'Lecturer A')] })) : text('busy', 503),
    );
    await expect(ucRecruitAdapter(FEED, { institution: 'X' })).rejects.toThrow(/none of 1 recruitment pages.*503/);
  });

  it('says so when the page has no recruitments or the site refuses, and needs an institution', async () => {
    await expect(ucRecruitAdapter(FEED, {})).rejects.toThrow(/institution/);
    mock(() => text('<html>blocked</html>'));
    await expect(ucRecruitAdapter(FEED, { institution: 'X' })).rejects.toThrow(/no recruitments/);
    mock(() => text('nope', 503));
    await expect(ucRecruitAdapter(FEED, { institution: 'X' })).rejects.toThrow(/503/);
  });
});

describe('ucRecruitAdapter deadline', () => {
  it('lets the final date win over an "apply by" review date in the text', async () => {
    const { extractDeadline } = await import('../../supabase/functions/_shared/ingest.ts');
    const FEED = 'https://recruit.example.edu/apply';
    const page = `<h3>Position overview</h3><p>Open date: October 24, 2026</p><p>Final date: Wednesday, Mar 31, 2027 at 11:59pm</p>` +
      `<h3 id="description">Position description</h3><p>For full consideration, please apply by July 1, 2026. Teach history courses to undergraduates.</p>`;
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(new Response(
      url === FEED
        ? `<tbody data-section="History / HIS"><tr id="JPF1"><td><div class='name'>Lecturer in History</div></td></tr></tbody>`
        : page))));
    const [job] = await ucRecruitAdapter(FEED, { institution: 'X' });
    expect(extractDeadline(job.description, new Date('2026-11-26'))).toBe('2027-03-31');
  });
});
