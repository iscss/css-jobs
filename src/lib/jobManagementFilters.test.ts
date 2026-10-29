import { describe, it, expect } from 'vitest';
import {
  applyJobFilters,
  EMPTY_JOB_FILTERS,
  matchesStatus,
  type JobManagementFilters,
} from '../components/admin/JobManagementFilters';

type J = Parameters<typeof applyJobFilters>[0][number];

let n = 0;
const job = (over: Partial<J>): J =>
  ({
    id: `j${++n}`,
    title: `Job ${n}`,
    institution: 'Uni',
    location: 'Somewhere',
    job_type: 'Postdoc',
    approval_status: 'pending',
    is_published: false,
    job_status: 'active',
    is_featured: false,
    is_auto_imported: true,
    relevance_score: null,
    application_deadline: null,
    created_at: '2026-10-01T00:00:00Z',
    ...over,
  }) as J;

const f = (over: Partial<JobManagementFilters>): JobManagementFilters => ({
  ...EMPTY_JOB_FILTERS,
  ...over,
});

const ids = (jobs: J[]) => jobs.map((j) => j.id);

const published = job({ id: 'pub', approval_status: 'approved', is_published: true, is_auto_imported: false });
const pending = job({ id: 'pen' });
const rejected = job({ id: 'rej', approval_status: 'rejected' });
const draft = job({ id: 'dra', approval_status: 'draft', is_auto_imported: false });
const closed = job({ id: 'clo', approval_status: 'approved', is_published: true, job_status: 'filled' });
const all = [published, pending, rejected, draft, closed];

describe('status filter', () => {
  it('shows everything for "all"', () => {
    expect(applyJobFilters(all, f({})).length).toBe(5);
  });

  it('published = is_published', () => {
    expect(ids(applyJobFilters(all, f({ status: 'published' }))).sort()).toEqual(['clo', 'pub']);
  });

  it.each([
    ['pending', ['pen']],
    ['rejected', ['rej']],
    ['draft', ['dra']],
    ['closed', ['clo']],
  ] as const)('%s', (status, expected) => {
    expect(ids(applyJobFilters(all, f({ status })))).toEqual(expected);
  });

  it('treats a missing approval_status as draft', () => {
    expect(matchesStatus(job({ approval_status: null as unknown as J['approval_status'] }), 'draft')).toBe(true);
  });
});

describe('other filters', () => {
  it('searches title, institution and location, case-insensitively', () => {
    const a = job({ title: 'Computational Sociology PhD' });
    const b = job({ institution: 'ETH Zurich' });
    const c = job({ location: 'Berlin, Germany' });
    const d = job({});
    expect(ids(applyJobFilters([a, b, c, d], f({ search: 'sociology' })))).toEqual([a.id]);
    expect(ids(applyJobFilters([a, b, c, d], f({ search: 'zurich' })))).toEqual([b.id]);
    expect(ids(applyJobFilters([a, b, c, d], f({ search: 'BERLIN' })))).toEqual([c.id]);
  });

  it('filters by type, origin and featured', () => {
    const phd = job({ job_type: 'PhD', is_featured: true, is_auto_imported: false });
    const post = job({ job_type: 'Postdoc' });
    expect(ids(applyJobFilters([phd, post], f({ jobType: 'PhD' })))).toEqual([phd.id]);
    expect(ids(applyJobFilters([phd, post], f({ origin: 'human' })))).toEqual([phd.id]);
    expect(ids(applyJobFilters([phd, post], f({ origin: 'imported' })))).toEqual([post.id]);
    expect(ids(applyJobFilters([phd, post], f({ featured: true })))).toEqual([phd.id]);
  });

  it('combines filters', () => {
    const a = job({ approval_status: 'rejected', job_type: 'PhD' });
    const b = job({ approval_status: 'rejected', job_type: 'Postdoc' });
    expect(ids(applyJobFilters([a, b, pending], f({ status: 'rejected', jobType: 'PhD' })))).toEqual([a.id]);
  });
});

describe('deadline filter', () => {
  const day = 86400000;
  const iso = (offset: number) => new Date(Date.now() + offset * day).toISOString().slice(0, 10);
  const soon = job({ application_deadline: iso(10) });
  const later = job({ application_deadline: iso(90) });
  const gone = job({ application_deadline: iso(-5) });
  const none = job({ application_deadline: null });
  const jobs = [soon, later, gone, none];

  it.each([
    ['open', [soon.id, later.id]],
    ['soon', [soon.id]],
    ['passed', [gone.id]],
    ['has', [soon.id, later.id, gone.id]],
    ['none', [none.id]],
  ])('%s', (deadline, expected) => {
    expect(ids(applyJobFilters(jobs, f({ deadline, sort: 'oldest' }))).sort()).toEqual([...expected].sort());
  });
});

describe('sorting', () => {
  const a = job({ title: 'B role', created_at: '2026-10-02T00:00:00Z', relevance_score: 0.4, application_deadline: '2026-12-01' });
  const b = job({ title: 'A role', created_at: '2026-10-03T00:00:00Z', relevance_score: 0.9, application_deadline: '2026-11-01' });
  const c = job({ title: 'C role', created_at: '2026-10-01T00:00:00Z', relevance_score: null, application_deadline: null });

  it('newest and oldest', () => {
    expect(ids(applyJobFilters([a, b, c], f({ sort: 'newest' })))).toEqual([b.id, a.id, c.id]);
    expect(ids(applyJobFilters([a, b, c], f({ sort: 'oldest' })))).toEqual([c.id, a.id, b.id]);
  });

  it('highest match puts unscored jobs last', () => {
    expect(ids(applyJobFilters([a, b, c], f({ sort: 'relevance' })))).toEqual([b.id, a.id, c.id]);
  });

  it('closing soonest puts jobs without a deadline last', () => {
    expect(ids(applyJobFilters([a, b, c], f({ sort: 'deadline' })))).toEqual([b.id, a.id, c.id]);
  });

  it('title A-Z', () => {
    expect(ids(applyJobFilters([a, b, c], f({ sort: 'title' })))).toEqual([b.id, a.id, c.id]);
  });

  it('does not mutate its input', () => {
    const input = [a, b, c];
    applyJobFilters(input, f({ sort: 'oldest' }));
    expect(ids(input)).toEqual([a.id, b.id, c.id]);
  });
});
