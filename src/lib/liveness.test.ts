import { describe, it, expect } from 'vitest';
import {
  checkListing,
  classifyPage,
  classifyWorkday,
  workdayJsonUrl,
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
