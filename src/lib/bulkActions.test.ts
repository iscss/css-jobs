import { describe, it, expect } from 'vitest';
import {
  MAX_BULK,
  partitionForBulk,
  skipReason,
  summarizeSkipped,
  type BulkJob,
} from './bulkActions';

const today = '2026-10-28';
const job = (over: Partial<BulkJob>): BulkJob => ({
  id: Math.random().toString(36).slice(2),
  approval_status: 'pending',
  job_status: 'active',
  application_deadline: null,
  ...over,
});

describe('approve', () => {
  it('allows pending, rejected and draft jobs', () => {
    for (const s of ['pending', 'rejected', 'draft']) {
      expect(skipReason(job({ approval_status: s }), 'approve', today)).toBeNull();
    }
  });

  it('skips jobs that are already approved', () => {
    expect(skipReason(job({ approval_status: 'approved' }), 'approve', today))
      .toBe('already approved');
  });

  it('skips closed jobs and jobs past their deadline', () => {
    expect(skipReason(job({ job_status: 'filled' }), 'approve', today)).toBe('marked closed');
    expect(skipReason(job({ application_deadline: '2026-10-27' }), 'approve', today))
      .toBe('deadline passed');
  });

  it('keeps a job whose deadline is today or later', () => {
    expect(skipReason(job({ application_deadline: today }), 'approve', today)).toBeNull();
    expect(skipReason(job({ application_deadline: '2026-12-01' }), 'approve', today)).toBeNull();
  });
});

describe('reject', () => {
  it('allows everything except already-rejected jobs', () => {
    for (const s of ['pending', 'approved', 'draft']) {
      expect(skipReason(job({ approval_status: s }), 'reject', today)).toBeNull();
    }
    expect(skipReason(job({ approval_status: 'rejected' }), 'reject', today))
      .toBe('already rejected');
  });

  it('can reject a published job (it is then unpublished by the caller)', () => {
    expect(skipReason(job({ approval_status: 'approved', job_status: 'filled' }), 'reject', today)).toBeNull();
  });
});

describe('partitionForBulk', () => {
  it('splits eligible from skipped and keeps order', () => {
    const a = job({ id: 'a' });
    const b = job({ id: 'b', approval_status: 'approved' });
    const c = job({ id: 'c', application_deadline: '2026-01-01' });
    const d = job({ id: 'd' });
    const r = partitionForBulk([a, b, c, d], 'approve', today);
    expect(r.eligible.map((j) => j.id)).toEqual(['a', 'd']);
    expect(r.skipped.map((s) => s.job.id)).toEqual(['b', 'c']);
  });

  it('summarizes skip reasons', () => {
    const r = partitionForBulk(
      [job({ approval_status: 'approved' }), job({ approval_status: 'approved' }), job({ job_status: 'filled' })],
      'approve',
      today,
    );
    expect(summarizeSkipped(r.skipped)).toBe('2 already approved, 1 marked closed');
  });

  it('has a sensible cap', () => {
    expect(MAX_BULK).toBeGreaterThan(0);
    expect(MAX_BULK).toBeLessThanOrEqual(500);
  });
});
