import React from 'react';
import { Bookmark, BookmarkCheck, Star } from 'lucide-react';
import { useSaveJob, useUnsaveJob, useCheckSavedJob } from '@/hooks/useSavedJobs';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type Job = Tables<'jobs'> & {
  job_tags: { id: string; tag: string; }[]
};

interface CompactJobCardProps {
  job: Job;
  onViewDetails: (job: Job) => void;
}

const CompactJobCard = ({ job, onViewDetails }: CompactJobCardProps) => {
  const { user } = useAuth();
  const { data: isSaved } = useCheckSavedJob(job?.id || '');
  const saveJob = useSaveJob();
  const unsaveJob = useUnsaveJob();

  const handleSaveToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    if (isSaved) {
      unsaveJob.mutate(job.id);
    } else {
      saveJob.mutate(job.id);
    }
  };

  const isLoading = saveJob.isPending || unsaveJob.isPending;
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const sameYear = date.getFullYear() === new Date().getFullYear();
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' }),
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // Left stripe and type tag share one colour per position type.
  const typeStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case 'postdoc': return { stripe: 'border-l-[#00796b]', tag: 'bg-[#e0f4f1] text-[#00796b]' };
      case 'faculty': return { stripe: 'border-l-brand-navy', tag: 'bg-[#e8ebf7] text-brand-navy' };
      case 'phd': return { stripe: 'border-l-[#3d5fb5]', tag: 'bg-[#e8eefb] text-[#3d5fb5]' };
      case 'research assistant':
      case 'ra': return { stripe: 'border-l-slate-500', tag: 'bg-slate-100 text-slate-600' };
      case 'internship': return { stripe: 'border-l-amber-500', tag: 'bg-amber-50 text-amber-700' };
      default: return { stripe: 'border-l-slate-400', tag: 'bg-slate-100 text-slate-600' };
    }
  };
  const style = typeStyle(job.job_type);

  const place = [job.department, job.location].filter(Boolean).join(' · ');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onViewDetails(job)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onViewDetails(job);
        }
      }}
      className={`group bg-white border border-[#e3e7ea] border-l-4 ${style.stripe} rounded-md px-[22px] py-5 cursor-pointer hover:shadow-md hover:border-[#d3d9de] transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/40 flex flex-col`}
    >
      {/* Top row: type tag on the left, deadline and save on the right */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-block px-[9px] py-[3px] rounded-[3px] text-[10px] font-bold uppercase tracking-[0.07em] ${style.tag}`}>
            {job.job_type}
          </span>
          {job.is_remote && (
            <span className="inline-block px-[9px] py-[3px] rounded-[3px] text-[10px] font-bold uppercase tracking-[0.07em] bg-emerald-50 text-emerald-700">
              Remote
            </span>
          )}
          {job.is_featured && (
            <span className="inline-flex items-center gap-1 px-[9px] py-[3px] rounded-[3px] text-[10px] font-bold uppercase tracking-[0.07em] bg-brand-gold/30 text-brand-navy">
              <Star className="w-3 h-3 fill-current" />
              Featured
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {job.application_deadline && (
            <span className="text-[11px] text-[#999]">Apply by {formatDate(job.application_deadline)}</span>
          )}
          {user && (
            <button
              onClick={handleSaveToggle}
              disabled={isLoading}
              aria-label={isSaved ? 'Remove from saved jobs' : 'Save job'}
              className={`p-1 rounded text-[#999] hover:text-brand-navy hover:bg-brand-surface transition-colors ${isSaved ? 'text-brand-navy' : ''}`}
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      <h3 className="text-base font-bold leading-snug text-[#16232b] group-hover:text-brand-navy transition-colors mb-1.5">
        {truncateText(job.title, 90)}
      </h3>
      <p className="text-[13px] font-semibold text-[#333]">{job.institution}</p>
      {place && <p className="text-xs text-[#777] mb-2.5">{place}</p>}

      <p className="text-[12.5px] leading-relaxed text-[#666] line-clamp-2">
        {truncateText(job.description, 160)}
      </p>
    </div>
  );
};

export default CompactJobCard;
