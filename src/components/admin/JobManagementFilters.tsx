import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, SlidersHorizontal, Star } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Job = Tables<'jobs'>;

export type JobStatusFilter =
  | 'all'
  | 'published'
  | 'pending'
  | 'rejected'
  | 'draft'
  | 'closed';

export type JobSort =
  | 'newest'
  | 'oldest'
  | 'relevance'
  | 'deadline'
  | 'title';

export interface JobManagementFilters {
  status: JobStatusFilter;
  search: string;
  jobType: string;
  origin: string;
  deadline: string;
  featured: boolean;
  sort: JobSort;
}

export const EMPTY_JOB_FILTERS: JobManagementFilters = {
  status: 'all',
  search: '',
  jobType: 'all',
  origin: 'all',
  deadline: 'all',
  featured: false,
  sort: 'newest',
};

export const STATUS_LABELS: Record<JobStatusFilter, string> = {
  all: 'All',
  published: 'Published',
  pending: 'Pending',
  rejected: 'Rejected',
  draft: 'Draft',
  closed: 'Closed',
};

const time = (value: string | null | undefined): number =>
  value ? new Date(value).getTime() : 0;

/** Does a job belong to this status view? */
export function matchesStatus(job: Job, status: JobStatusFilter): boolean {
  switch (status) {
    case 'all':
      return true;
    case 'published':
      return job.is_published === true;
    case 'pending':
      return job.approval_status === 'pending';
    case 'rejected':
      return job.approval_status === 'rejected';
    case 'draft':
      return !job.approval_status || job.approval_status === 'draft';
    case 'closed':
      return job.job_status === 'filled';
  }
}

/**
 * Applies the Job Management filters and sort. Kept as a pure function (rather
 * than inline in the component) so the rules can be tested without rendering.
 * It never mutates the array it is given.
 */
export function applyJobFilters<T extends Job>(
  jobs: T[],
  filters: JobManagementFilters,
): T[] {
  const search = filters.search.trim().toLowerCase();

  const filtered = jobs.filter((job) => {
    if (!matchesStatus(job, filters.status)) return false;
    if (filters.featured && !job.is_featured) return false;
    if (filters.jobType !== 'all' && job.job_type !== filters.jobType) {
      return false;
    }
    if (filters.origin === 'imported' && !job.is_auto_imported) return false;
    if (filters.origin === 'human' && job.is_auto_imported) return false;

    if (filters.deadline !== 'all') {
      const deadline = job.application_deadline;
      const daysLeft = deadline
        ? Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
        : null;
      if (filters.deadline === 'none' && deadline) return false;
      if (filters.deadline === 'has' && !deadline) return false;
      if (filters.deadline === 'open' && (daysLeft === null || daysLeft < 0)) {
        return false;
      }
      if (
        filters.deadline === 'soon' &&
        (daysLeft === null || daysLeft < 0 || daysLeft > 30)
      ) {
        return false;
      }
      if (filters.deadline === 'passed' && (daysLeft === null || daysLeft >= 0)) {
        return false;
      }
    }

    if (search) {
      const haystack = [job.title, job.institution, job.location]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  const byNewest = (a: T, b: T) => time(b.created_at) - time(a.created_at);

  return [...filtered].sort((a, b) => {
    switch (filters.sort) {
      case 'oldest':
        return time(a.created_at) - time(b.created_at);
      case 'relevance': {
        // Jobs with no score (hand-posted) sort after scored ones.
        const sa = a.relevance_score ?? -1;
        const sb = b.relevance_score ?? -1;
        return sb - sa || byNewest(a, b);
      }
      case 'deadline': {
        // Closing soonest first; jobs with no deadline go last.
        const da = a.application_deadline
          ? time(a.application_deadline)
          : Number.POSITIVE_INFINITY;
        const db = b.application_deadline
          ? time(b.application_deadline)
          : Number.POSITIVE_INFINITY;
        if (da === db) return byNewest(a, b);
        return da < db ? -1 : 1;
      }
      case 'title':
        return (a.title ?? '').localeCompare(b.title ?? '') || byNewest(a, b);
      case 'newest':
      default:
        return byNewest(a, b);
    }
  });
}

export const filtersAreDefault = (f: JobManagementFilters): boolean =>
  JSON.stringify(f) === JSON.stringify(EMPTY_JOB_FILTERS);

interface Props {
  filters: JobManagementFilters;
  onChange: (filters: JobManagementFilters) => void;
  counts?: { total: number; published: number; pending: number; rejected: number };
  shown: number;
  loaded: number;
}

const STATUS_ORDER: JobStatusFilter[] = [
  'all',
  'published',
  'pending',
  'rejected',
  'draft',
  'closed',
];

const JobManagementFiltersBar = ({
  filters,
  onChange,
  counts,
  shown,
  loaded,
}: Props) => {
  const set = (patch: Partial<JobManagementFilters>) =>
    onChange({ ...filters, ...patch });

  const countFor = (status: JobStatusFilter): number | undefined => {
    if (!counts) return undefined;
    if (status === 'all') return counts.total;
    if (status === 'published') return counts.published;
    if (status === 'pending') return counts.pending;
    if (status === 'rejected') return counts.rejected;
    return undefined;
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {shown} of {loaded}
            </span>
            {!filtersAreDefault(filters) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange(EMPTY_JOB_FILTERS)}
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Status">
          {STATUS_ORDER.map((status) => {
            const active = filters.status === status;
            const count = countFor(status);
            return (
              <Button
                key={status}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                aria-pressed={active}
                onClick={() => set({ status })}
              >
                {STATUS_LABELS[status]}
                {count !== undefined && (
                  <span className={active ? 'ml-1.5 opacity-80' : 'ml-1.5 text-gray-500'}>
                    {count}
                  </span>
                )}
              </Button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search title, institution, location…"
              value={filters.search}
              onChange={(e) => set({ search: e.target.value })}
              className="pl-9"
              aria-label="Search jobs"
            />
          </div>

          <Select value={filters.jobType} onValueChange={(v) => set({ jobType: v })}>
            <SelectTrigger aria-label="Job type"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="PhD">PhD</SelectItem>
              <SelectItem value="Postdoc">Postdoc</SelectItem>
              <SelectItem value="Faculty">Faculty</SelectItem>
              <SelectItem value="Research Assistant">Research Assistant</SelectItem>
              <SelectItem value="Internship">Internship</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.origin} onValueChange={(v) => set({ origin: v })}>
            <SelectTrigger aria-label="Origin"><SelectValue placeholder="Origin" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All origins</SelectItem>
              <SelectItem value="imported">Auto-imported</SelectItem>
              <SelectItem value="human">Posted by a person</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.deadline} onValueChange={(v) => set({ deadline: v })}>
            <SelectTrigger aria-label="Deadline"><SelectValue placeholder="Deadline" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any deadline</SelectItem>
              <SelectItem value="open">Still open</SelectItem>
              <SelectItem value="soon">Closing in 30 days</SelectItem>
              <SelectItem value="passed">Already closed</SelectItem>
              <SelectItem value="has">Has a deadline</SelectItem>
              <SelectItem value="none">No deadline listed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.sort} onValueChange={(v) => set({ sort: v as JobSort })}>
            <SelectTrigger aria-label="Sort by"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="relevance">Highest match</SelectItem>
              <SelectItem value="deadline">Closing soonest</SelectItem>
              <SelectItem value="title">Title A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.featured}
            onChange={(e) => set({ featured: e.target.checked })}
            className="h-4 w-4 accent-[hsl(var(--brand-navy))]"
          />
          <Star className="w-4 h-4" />
          Featured only
        </label>
      </CardContent>
    </Card>
  );
};

export default JobManagementFiltersBar;
