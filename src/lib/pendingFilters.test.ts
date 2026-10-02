import { describe, it, expect } from 'vitest';
import {
  applyPendingFilters,
  countActiveFilters,
  EMPTY_PENDING_FILTERS,
  type PendingFilters,
} from '../components/admin/PendingJobFilters';
import type { Tables } from '../integrations/supabase/types';

type Job = Tables<'jobs'>;

const DAY = 86400000;
const iso = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

// Only the fields the filters read need to be realistic.
const job = (over: Partial<Job>): Job =>
  ({
    id: Math.random().toString(36),
    title: 'Postdoc in Computational Social Science',
    institution: 'University of Oxford',
    location: 'Oxford, UK',
    description: 'Agent-based modelling of collective behaviour.',
    job_type: 'Postdoc',
    source: 'comses',
    is_auto_imported: true,
    relevance_score: 0.8,
    posted_at: iso(-10),
    application_deadline: null,
    ...over,
  }) as unknown as Job;

const filters = (over: Partial<PendingFilters>): PendingFilters => ({
  ...EMPTY_PENDING_FILTERS,
  ...over,
});

describe('applyPendingFilters', () => {
  it('returns everything when no filter is set', () => {
    const jobs = [job({}), job({ source: 'jobrxiv' })];
    expect(applyPendingFilters(jobs, EMPTY_PENDING_FILTERS)).toHaveLength(2);
  });

  it('searches across title, institution, and description', () => {
    const jobs = [
      job({ title: 'Postdoc in Network Science' }),
      job({ institution: 'Santa Fe Institute' }),
      job({ description: 'Studies misinformation spread.' }),
      job({ title: 'Lab Technician', institution: 'X', description: 'Pipetting.' }),
    ];

    expect(applyPendingFilters(jobs, filters({ search: 'network' }))).toHaveLength(1);
    expect(applyPendingFilters(jobs, filters({ search: 'santa fe' }))).toHaveLength(1);
    expect(applyPendingFilters(jobs, filters({ search: 'misinformation' }))).toHaveLength(1);
  });

  it('matches search case-insensitively', () => {
    const jobs = [job({ title: 'Computational Social Science' })];
    expect(applyPendingFilters(jobs, filters({ search: 'COMPUTATIONAL' }))).toHaveLength(1);
  });

  it('filters by source', () => {
    const jobs = [job({ source: 'comses' }), job({ source: 'jobrxiv' })];
    expect(applyPendingFilters(jobs, filters({ source: 'comses' }))).toHaveLength(1);
  });

  it('filters by job type', () => {
    const jobs = [job({ job_type: 'Postdoc' }), job({ job_type: 'PhD' })];
    expect(applyPendingFilters(jobs, filters({ jobType: 'PhD' }))).toHaveLength(1);
  });

  it('filters by location substring', () => {
    const jobs = [
      job({ location: 'Berlin, Germany' }),
      job({ location: 'Oxford, UK' }),
    ];
    expect(applyPendingFilters(jobs, filters({ location: 'germany' }))).toHaveLength(1);
  });

  it('filters by minimum relevance score', () => {
    const jobs = [
      job({ relevance_score: 0.9 }),
      job({ relevance_score: 0.4 }),
      job({ relevance_score: 0 }),
    ];
    expect(applyPendingFilters(jobs, filters({ minScore: '0.5' }))).toHaveLength(1);
    expect(applyPendingFilters(jobs, filters({ minScore: '0.05' }))).toHaveLength(2);
  });

  it('excludes unscored jobs from a minimum-score filter', () => {
    // A job with no score cannot be shown to clear the bar.
    const jobs = [job({ relevance_score: null })];
    expect(applyPendingFilters(jobs, filters({ minScore: '0.5' }))).toHaveLength(0);
    expect(applyPendingFilters(jobs, EMPTY_PENDING_FILTERS)).toHaveLength(1);
  });

  it('filters by posting age', () => {
    const jobs = [
      job({ posted_at: iso(-3) }),
      job({ posted_at: iso(-45) }),
      job({ posted_at: iso(-200) }),
    ];
    expect(applyPendingFilters(jobs, filters({ maxAge: '7' }))).toHaveLength(1);
    expect(applyPendingFilters(jobs, filters({ maxAge: '90' }))).toHaveLength(2);
  });

  it('keeps undated jobs under an age filter', () => {
    // Mirrors ingestion: absence of a date is not evidence of staleness.
    const jobs = [job({ posted_at: null })];
    expect(applyPendingFilters(jobs, filters({ maxAge: '7' }))).toHaveLength(1);
  });

  it('filters by deadline state', () => {
    const jobs = [
      job({ application_deadline: iso(10) }),   // open, closing soon
      job({ application_deadline: iso(90) }),   // open, further out
      job({ application_deadline: iso(-5) }),   // already closed
      job({ application_deadline: null }),      // none listed
    ];

    expect(applyPendingFilters(jobs, filters({ deadline: 'open' }))).toHaveLength(2);
    expect(applyPendingFilters(jobs, filters({ deadline: 'soon' }))).toHaveLength(1);
    expect(applyPendingFilters(jobs, filters({ deadline: 'passed' }))).toHaveLength(1);
    expect(applyPendingFilters(jobs, filters({ deadline: 'has' }))).toHaveLength(3);
    expect(applyPendingFilters(jobs, filters({ deadline: 'none' }))).toHaveLength(1);
  });

  it('filters by origin', () => {
    const jobs = [
      job({ is_auto_imported: true }),
      job({ is_auto_imported: false, source: null }),
    ];
    expect(applyPendingFilters(jobs, filters({ origin: 'imported' }))).toHaveLength(1);
    expect(applyPendingFilters(jobs, filters({ origin: 'human' }))).toHaveLength(1);
  });

  it('combines filters with AND, not OR', () => {
    const jobs = [
      job({ source: 'comses', job_type: 'Postdoc' }),
      job({ source: 'comses', job_type: 'PhD' }),
      job({ source: 'jobrxiv', job_type: 'Postdoc' }),
    ];
    const result = applyPendingFilters(
      jobs,
      filters({ source: 'comses', jobType: 'Postdoc' }),
    );
    expect(result).toHaveLength(1);
  });

  it('never mutates the input array', () => {
    const jobs = [job({ source: 'comses' }), job({ source: 'jobrxiv' })];
    const before = [...jobs];
    applyPendingFilters(jobs, filters({ source: 'comses' }));
    expect(jobs).toEqual(before);
  });
});

describe('countActiveFilters', () => {
  it('counts nothing when filters are cleared', () => {
    expect(countActiveFilters(EMPTY_PENDING_FILTERS)).toBe(0);
  });

  it('counts each changed filter once', () => {
    expect(
      countActiveFilters(filters({ source: 'comses', minScore: '0.5', search: 'abm' })),
    ).toBe(3);
  });
});
