import { describe, it, expect } from 'vitest';
import {
  decodeEntities,
  stripHtml,
  mapJobType,
  scoreRelevance,
  contentHash,
  normalizeJob,
  SkippedJobError,
  StaleJobError,
  parsePostedAt,
  extractDeadline,
} from '../../supabase/functions/_shared/ingest.ts';

const BOT = '00000000-0000-4000-a000-000000000b07';

const validRaw = {
  title: 'Postdoctoral Researcher in Computational Social Science',
  institution: 'University of Oxford',
  location: 'Oxford, UK',
  description:
    '<p>We seek a postdoc to study social networks using computational ' +
    'methods and large-scale digital trace data across several projects.</p>',
  sourceUrl: 'https://jobrxiv.org/job/example-1/',
};

describe('decodeEntities', () => {
  it('decodes named, decimal, and hex entities', () => {
    expect(decodeEntities('A &ndash; B')).toBe('A – B');
    expect(decodeEntities('R&amp;D')).toBe('R&D');
    expect(decodeEntities('Teaching &#8211; 2026/96')).toBe('Teaching – 2026/96');
    expect(decodeEntities('&#x2013;')).toBe('–');
  });

  it('leaves unknown entities untouched rather than mangling them', () => {
    expect(decodeEntities('&unknownentity;')).toBe('&unknownentity;');
  });
});

describe('stripHtml', () => {
  it('removes markup while keeping readable text', () => {
    const out = stripHtml('<p>Hello</p><p>World</p>');
    expect(out).toContain('Hello');
    expect(out).toContain('World');
    expect(out).not.toContain('<p>');
  });

  it('drops script and style contents entirely', () => {
    const out = stripHtml('<script>alert(1)</script><p>Safe</p>');
    expect(out).not.toContain('alert');
    expect(out).toContain('Safe');
  });

  it('turns list items into bullets', () => {
    expect(stripHtml('<ul><li>One</li><li>Two</li></ul>')).toContain('• One');
  });
});

describe('mapJobType', () => {
  it('maps common academic titles to the schema enum', () => {
    expect(mapJobType(undefined, 'PhD Position in Sociology')).toBe('PhD');
    expect(mapJobType(undefined, 'Postdoctoral Fellow')).toBe('Postdoc');
    expect(mapJobType(undefined, 'Assistant Professor of Politics')).toBe('Faculty');
    expect(mapJobType(undefined, 'Research Assistant')).toBe('Research Assistant');
    expect(mapJobType(undefined, 'Summer Internship')).toBe('Internship');
  });

  it('falls back to Other when nothing matches', () => {
    expect(mapJobType(undefined, 'Laboratory Manager')).toBe('Other');
  });

  it('never returns the stale RA label that production no longer has', () => {
    // The initial migration created 'RA'; production uses 'Research Assistant'.
    expect(mapJobType('RA', 'Research Assistant role')).toBe('Research Assistant');
  });
});

describe('scoreRelevance', () => {
  it('scores an obvious CSS role above an unrelated one', () => {
    const css = scoreRelevance(
      'Postdoc in Computational Social Science',
      'Studying social networks with digital trace data.',
    );
    const unrelated = scoreRelevance(
      'Social Media Manager',
      'Run our marketing campaigns and grow the brand.',
    );
    expect(css.score).toBeGreaterThan(unrelated.score);
  });

  it('clamps scores into the 0..1 range the CHECK constraint allows', () => {
    const high = scoreRelevance(
      'Computational Social Science and Computational Sociology',
      'agent-based modelling network analysis NLP machine learning sociology',
    );
    const low = scoreRelevance(
      'Social Media Manager',
      'marketing sales fundraising nursing clinical trial',
    );
    expect(high.score).toBeLessThanOrEqual(1);
    expect(low.score).toBeGreaterThanOrEqual(0);
  });

  it('explains which signals fired', () => {
    expect(
      scoreRelevance('Computational Social Science', 'x').reasoning,
    ).toContain('computational social scien');
  });

  // Regression tests for real jobRxiv listings that the first scoring version
  // ranked near the top. CSS is the intersection of a computational method and
  // a social subject, so a method word alone must not carry a job.
  it('zeroes natural-science jobs that mention computational methods', () => {
    const cases = [
      ['Research Assistant (AI for Seismic Data Analysis)',
       'Applying machine learning to seismic waveform data.'],
      ['PhD candidate – Monitoring Ionospheric TEC responses',
       'Deep learning applied to ionospheric total electron content.'],
      ['Principal Scientist, Immunology and Immuno-oncology',
       'Statistical modelling of immunology assay data.'],
      ['Senior Associate Scientist, Oligonucleotides',
       'Data science supporting drug discovery pipelines.'],
    ] as const;

    for (const [title, description] of cases) {
      expect(scoreRelevance(title, description).score).toBe(0);
    }
  });

  it('scores a genuine CSS role far above a generic ML role', () => {
    const css = scoreRelevance(
      'Postdoctoral Fellow in Computational Social Science',
      'Agent-based modelling of collective behaviour and social networks.',
    );
    const genericMl = scoreRelevance(
      'ML Expert / Senior Scientist I',
      'Machine learning across a range of research problems.',
    );

    expect(css.score).toBeGreaterThan(0.8);
    expect(genericMl.score).toBeLessThan(0.1);
  });

  it('requires both halves — a method or subject alone scores near zero', () => {
    const methodOnly = scoreRelevance(
      'Data Scientist',
      'Machine learning and statistical modelling.',
    );
    const subjectOnly = scoreRelevance(
      'Lecturer in Sociology',
      'Teaching classical sociological theory.',
    );
    const both = scoreRelevance(
      'Postdoc in Social Network Analysis',
      'Network science applied to online communities and misinformation.',
    );

    expect(methodOnly.score).toBeLessThan(0.1);
    expect(subjectOnly.score).toBeLessThan(0.15);
    expect(both.score).toBeGreaterThan(methodOnly.score + subjectOnly.score);
  });

  it('accepts an explicit field name on its own', () => {
    expect(
      scoreRelevance('Computational Sociology Postdoc', 'See website.').score,
    ).toBeGreaterThan(0.8);
  });
});

describe('contentHash', () => {
  it('collapses formatting differences so syndicated copies dedupe', async () => {
    const a = await contentHash('Postdoc in CSS', 'Oxford University');
    const b = await contentHash('  postdoc in  css! ', 'Oxford University');
    expect(a).toBe(b);
  });

  it('distinguishes the same role at different institutions', async () => {
    const a = await contentHash('Postdoc in CSS', 'Oxford University');
    const b = await contentHash('Postdoc in CSS', 'Cambridge University');
    expect(a).not.toBe(b);
  });
});

describe('normalizeJob', () => {
  it('produces a row that satisfies the jobs table constraints', async () => {
    const job = await normalizeJob(validRaw, 'jobrxiv', BOT);

    expect(job.title.length).toBeGreaterThanOrEqual(5);
    expect(job.title.length).toBeLessThanOrEqual(200);
    expect(job.institution.length).toBeGreaterThanOrEqual(2);
    expect(job.description.length).toBeGreaterThanOrEqual(50);
    expect(job.description.length).toBeLessThanOrEqual(10000);
    expect(job.application_url).toMatch(/^https?:\/\//);
    expect(job.posted_by).toBe(BOT);
    expect(job.is_auto_imported).toBe(true);
  });

  it('truncates over-long descriptions to the 10000 char limit', async () => {
    const job = await normalizeJob(
      { ...validRaw, description: 'a '.repeat(20000) },
      'jobrxiv',
      BOT,
    );
    expect(job.description.length).toBeLessThanOrEqual(10000);
  });

  it('skips rows the database would reject rather than throwing', async () => {
    await expect(
      normalizeJob({ ...validRaw, description: 'too short' }, 'jobrxiv', BOT),
    ).rejects.toBeInstanceOf(SkippedJobError);

    await expect(
      normalizeJob({ ...validRaw, title: 'abc' }, 'jobrxiv', BOT),
    ).rejects.toBeInstanceOf(SkippedJobError);

    await expect(
      normalizeJob({ ...validRaw, institution: '' }, 'jobrxiv', BOT),
    ).rejects.toBeInstanceOf(SkippedJobError);
  });

  it('rejects non-http source URLs that would fail the URL constraint', async () => {
    await expect(
      normalizeJob(
        { ...validRaw, sourceUrl: 'javascript:alert(1)' },
        'jobrxiv',
        BOT,
      ),
    ).rejects.toBeInstanceOf(SkippedJobError);
  });

  it('decodes entities in the title, not just the body', async () => {
    const job = await normalizeJob(
      { ...validRaw, title: 'Scientific Assistant &#8211; 2026/96' },
      'jobrxiv',
      BOT,
    );
    expect(job.title).toBe('Scientific Assistant – 2026/96');
  });

  it('falls back to the source URL when no application URL is given', async () => {
    const job = await normalizeJob(validRaw, 'jobrxiv', BOT);
    expect(job.application_url).toBe(validRaw.sourceUrl);
  });
});

describe('parsePostedAt', () => {
  const now = new Date('2026-08-22T12:00:00Z');

  it('parses RSS RFC-2822 pubDate', () => {
    expect(parsePostedAt('Mon, 03 Aug 2026 20:18:07 +0000', now)).toBe('2026-08-03');
  });

  it('parses ISO dates from Workday', () => {
    expect(parsePostedAt('2026-07-28', now)).toBe('2026-07-28');
  });

  it('parses relative "Posted N Days Ago" strings', () => {
    expect(parsePostedAt('Posted 13 Days Ago', now)).toBe('2026-08-09');
    expect(parsePostedAt('Posted 30+ Days Ago', now)).toBe('2026-07-23');
    expect(parsePostedAt('Posted Today', now)).toBe('2026-08-22');
    expect(parsePostedAt('Posted Yesterday', now)).toBe('2026-08-21');
  });

  it('returns null for missing or unparseable input', () => {
    expect(parsePostedAt(undefined, now)).toBeNull();
    expect(parsePostedAt('', now)).toBeNull();
    expect(parsePostedAt('sometime last spring', now)).toBeNull();
  });

  it('rejects dates implausibly far in the future', () => {
    // A parse artefact, not a real posting date.
    expect(parsePostedAt('2099-01-01', now)).toBeNull();
  });
});

describe('extractDeadline', () => {
  const now = new Date('2026-08-22T12:00:00Z');

  it('reads a stated application deadline in several phrasings', () => {
    expect(extractDeadline('Application deadline: 15 September 2026', now))
      .toBe('2026-09-15');
    expect(extractDeadline('Please apply by October 1, 2026.', now))
      .toBe('2026-10-01');
    expect(extractDeadline('Closing date: 30 November 2026', now))
      .toBe('2026-11-30');
  });

  it('returns null when no deadline is stated', () => {
    expect(extractDeadline('We are recruiting a postdoc.', now)).toBeNull();
  });

  it('ignores implausible dates from typos', () => {
    expect(extractDeadline('Application deadline: 2 August 20226', now)).toBeNull();
  });
});

describe('normalizeJob freshness', () => {
  const now = new Date('2026-08-22T12:00:00Z');
  const base = {
    title: 'Postdoctoral Researcher in Computational Social Science',
    institution: 'University of Oxford',
    location: 'Oxford, UK',
    description:
      'We seek a postdoc to study social networks using computational ' +
      'methods and large-scale digital trace data across several projects.',
    sourceUrl: 'https://example.org/job/1',
  };

  it('stores the posting date on the row', async () => {
    const job = await normalizeJob(
      { ...base, postedAt: 'Mon, 03 Aug 2026 20:18:07 +0000' },
      'test',
      BOT,
      { now },
    );
    expect(job.posted_at).toBe('2026-08-03');
  });

  it('rejects a listing older than the source window', async () => {
    // CoMSES still serves postings from 2021; without this the queue fills
    // with roles that closed years ago.
    await expect(
      normalizeJob(
        { ...base, postedAt: '2021-03-01' },
        'comses',
        BOT,
        { maxAgeDays: 180, now },
      ),
    ).rejects.toBeInstanceOf(StaleJobError);
  });

  it('keeps a listing inside the window', async () => {
    const job = await normalizeJob(
      { ...base, postedAt: '2026-07-01' },
      'comses',
      BOT,
      { maxAgeDays: 180, now },
    );
    expect(job.posted_at).toBe('2026-07-01');
  });

  it('rejects a listing whose stated deadline has passed', async () => {
    await expect(
      normalizeJob(
        { ...base, description: `${base.description} Application deadline: 1 March 2026.` },
        'test',
        BOT,
        { now },
      ),
    ).rejects.toBeInstanceOf(StaleJobError);
  });

  it('keeps an undated listing — absence of a date is not staleness', async () => {
    const job = await normalizeJob(base, 'comses', BOT, { maxAgeDays: 180, now });
    expect(job.posted_at).toBeNull();
  });

  it('applies no age limit when the source sets none', async () => {
    const job = await normalizeJob(
      { ...base, postedAt: '2021-03-01' },
      'jobrxiv',
      BOT,
      { now },
    );
    expect(job.posted_at).toBe('2021-03-01');
  });
});
