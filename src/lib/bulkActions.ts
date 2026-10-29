// Rules for the admin bulk approve / reject buttons.
//
// Kept as pure functions so the rules can be tested without rendering. The
// important one: approving PUBLISHES a job, so jobs that cannot or should not
// go live (already approved, closed, past their deadline) are skipped rather
// than silently pushed through.

export type BulkAction = 'approve' | 'reject';

/** Most jobs one bulk action will touch. Keeps a slip of the mouse bounded. */
export const MAX_BULK = 300;

export interface BulkJob {
  id: string;
  approval_status?: string | null;
  job_status?: string | null;
  application_deadline?: string | null;
}

export interface SkippedJob<T> {
  job: T;
  reason: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export function skipReason(
  job: BulkJob,
  action: BulkAction,
  today: string = todayIso(),
): string | null {
  if (action === 'reject') {
    return job.approval_status === 'rejected' ? 'already rejected' : null;
  }
  if (job.approval_status === 'approved') return 'already approved';
  if (job.job_status === 'filled') return 'marked closed';
  if (job.application_deadline && job.application_deadline < today) {
    return 'deadline passed';
  }
  return null;
}

export function partitionForBulk<T extends BulkJob>(
  jobs: T[],
  action: BulkAction,
  today: string = todayIso(),
): { eligible: T[]; skipped: SkippedJob<T>[] } {
  const eligible: T[] = [];
  const skipped: SkippedJob<T>[] = [];
  for (const job of jobs) {
    const reason = skipReason(job, action, today);
    if (reason) skipped.push({ job, reason });
    else eligible.push(job);
  }
  return { eligible, skipped };
}

/** "3 already approved, 1 deadline passed" */
export function summarizeSkipped<T>(skipped: SkippedJob<T>[]): string {
  const byReason = new Map<string, number>();
  for (const { reason } of skipped) {
    byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
  }
  return [...byReason.entries()].map(([r, n]) => `${n} ${r}`).join(', ');
}
