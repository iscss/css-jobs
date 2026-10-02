import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Job = Tables<'jobs'>;

export interface PendingFilters {
  search: string;
  source: string;
  jobType: string;
  origin: string;
  minScore: string;
  maxAge: string;
  deadline: string;
  location: string;
}

export const EMPTY_PENDING_FILTERS: PendingFilters = {
  search: '',
  source: 'all',
  jobType: 'all',
  origin: 'all',
  minScore: 'all',
  maxAge: 'all',
  deadline: 'all',
  location: '',
};

const daysSince = (date: string | null): number | null =>
  date === null
    ? null
    : Math.floor((Date.now() - new Date(date).getTime()) / 86400000);

/**
 * Applies the admin queue filters. Kept as a pure function (rather than inline
 * in the component) so the filtering rules can be tested without rendering.
 */
export function applyPendingFilters<T extends Job>(
  jobs: T[],
  filters: PendingFilters,
): T[] {
  const search = filters.search.trim().toLowerCase();
  const location = filters.location.trim().toLowerCase();
  const minScore = filters.minScore === 'all' ? null : Number(filters.minScore);
  const maxAge = filters.maxAge === 'all' ? null : Number(filters.maxAge);

  return jobs.filter((job) => {
    if (search) {
      const haystack = [job.title, job.institution, job.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    if (location && !(job.location ?? '').toLowerCase().includes(location)) {
      return false;
    }

    if (filters.source !== 'all' && (job.source ?? '') !== filters.source) {
      return false;
    }

    if (filters.jobType !== 'all' && job.job_type !== filters.jobType) {
      return false;
    }

    if (filters.origin === 'imported' && !job.is_auto_imported) return false;
    if (filters.origin === 'human' && job.is_auto_imported) return false;

    if (minScore !== null) {
      // An unscored job has no score to compare, so it cannot clear a
      // minimum-score bar; excluding it keeps the filter honest.
      if (job.relevance_score === null) return false;
      if (Number(job.relevance_score) < minScore) return false;
    }

    if (maxAge !== null) {
      const age = daysSince(job.posted_at);
      // Undated jobs are kept: absence of a date is not evidence of staleness,
      // matching how ingestion treats them.
      if (age !== null && age > maxAge) return false;
    }

    if (filters.deadline !== 'all') {
      const deadline = job.application_deadline;
      const daysLeft =
        deadline === null
          ? null
          : Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);

      if (filters.deadline === 'has' && deadline === null) return false;
      if (filters.deadline === 'none' && deadline !== null) return false;
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

    return true;
  });
}

export function countActiveFilters(filters: PendingFilters): number {
  return Object.entries(filters).filter(([key, value]) => {
    const empty = EMPTY_PENDING_FILTERS[key as keyof PendingFilters];
    return value !== empty;
  }).length;
}

interface PendingJobFiltersProps {
  jobs: Job[];
  filters: PendingFilters;
  onChange: (filters: PendingFilters) => void;
  resultCount: number;
}

const PendingJobFilters = ({
  jobs,
  filters,
  onChange,
  resultCount,
}: PendingJobFiltersProps) => {
  // Only offer sources that are actually present in the queue, so the dropdown
  // never lists an option that would return nothing.
  const sources = useMemo(() => {
    const seen = new Map<string, number>();
    for (const job of jobs) {
      if (!job.source) continue;
      seen.set(job.source, (seen.get(job.source) ?? 0) + 1);
    }
    return [...seen.entries()].sort((a, b) => b[1] - a[1]);
  }, [jobs]);

  const set = (patch: Partial<PendingFilters>) =>
    onChange({ ...filters, ...patch });

  const activeCount = countActiveFilters(filters);

  return (
    <Card className="mb-4">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeCount > 0 && (
              <Badge variant="secondary">{activeCount} active</Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {resultCount} of {jobs.length}
            </span>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange(EMPTY_PENDING_FILTERS)}
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search title, institution, description…"
              value={filters.search}
              onChange={(e) => set({ search: e.target.value })}
              className="pl-9"
            />
          </div>
          <Input
            placeholder="Location contains… (e.g. Berlin, UK, Remote)"
            value={filters.location}
            onChange={(e) => set({ location: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <Select value={filters.source} onValueChange={(v) => set({ source: v })}>
            <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sources.map(([slug, count]) => (
                <SelectItem key={slug} value={slug}>
                  {slug} ({count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.jobType} onValueChange={(v) => set({ jobType: v })}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
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

          <Select value={filters.minScore} onValueChange={(v) => set({ minScore: v })}>
            <SelectTrigger><SelectValue placeholder="Match" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any match</SelectItem>
              <SelectItem value="0.75">75%+ (strong)</SelectItem>
              <SelectItem value="0.5">50%+</SelectItem>
              <SelectItem value="0.25">25%+</SelectItem>
              <SelectItem value="0.05">Above zero</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.maxAge} onValueChange={(v) => set({ maxAge: v })}>
            <SelectTrigger><SelectValue placeholder="Posted" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any age</SelectItem>
              <SelectItem value="7">Past week</SelectItem>
              <SelectItem value="30">Past month</SelectItem>
              <SelectItem value="90">Past 3 months</SelectItem>
              <SelectItem value="180">Past 6 months</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.deadline} onValueChange={(v) => set({ deadline: v })}>
            <SelectTrigger><SelectValue placeholder="Deadline" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any deadline</SelectItem>
              <SelectItem value="open">Still open</SelectItem>
              <SelectItem value="soon">Closing in 30 days</SelectItem>
              <SelectItem value="passed">Already closed</SelectItem>
              <SelectItem value="has">Has a deadline</SelectItem>
              <SelectItem value="none">No deadline listed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.origin} onValueChange={(v) => set({ origin: v })}>
            <SelectTrigger><SelectValue placeholder="Origin" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All origins</SelectItem>
              <SelectItem value="imported">Auto-imported</SelectItem>
              <SelectItem value="human">Posted by a person</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingJobFilters;
