import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Building2, Calendar, Eye, User, Clock, Globe, Bookmark, BookmarkCheck, Star } from 'lucide-react';
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
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const getJobTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'phd': return 'bg-blue-500 text-white';
      case 'postdoc': return 'bg-emerald-500 text-white';
      case 'faculty': return 'bg-purple-500 text-white';
      case 'ra': return 'bg-orange-500 text-white';
      case 'internship': return 'bg-pink-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  return (
    <div className="relative bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-md transition-all duration-200 group min-h-[320px] flex flex-col">
      {/* Featured badge */}
      {job.is_featured && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="bg-gradient-to-r from-purple-500 to-violet-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg flex items-center gap-2">
            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            Featured
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
            {job.job_type}
          </span>
          {job.is_remote && (
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
              Remote
            </span>
          )}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors leading-tight">
          {truncateText(job.title, 70)}
        </h3>
      </div>

      {/* Institution */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">{job.institution}</p>
            {job.department && (
              <p className="text-gray-600 text-sm">{job.department}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span>{job.location}</span>
              </div>
              {job.pi_name && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3 text-gray-400" />
                  <span className="truncate">PI: {truncateText(job.pi_name, 20)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      {job.job_tags && job.job_tags.length > 0 && (
        <div className="flex-shrink-0 mb-4">
          <div className="flex flex-wrap gap-1.5">
            {job.job_tags.slice(0, 3).map((tag) => (
              <span key={tag.id} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                {tag.tag}
              </span>
            ))}
            {job.job_tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">
                +{job.job_tags.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      <div className="flex-1 mb-4">
        <p className="text-gray-600 text-sm leading-relaxed">
          {truncateText(job.description, 100)}
        </p>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 space-y-3">
        {(job.application_deadline || job.duration) && (
          <div className="flex flex-wrap gap-2">
            {job.application_deadline && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded text-xs">
                <Calendar className="w-3 h-3" />
                Due {formatDate(job.application_deadline)}
              </div>
            )}
            {job.duration && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                <Clock className="w-3 h-3" />
                {job.duration}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={() => onViewDetails(job)}
            className="flex-1 modern-gradient text-white py-2.5 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-lg mr-3"
          >
            <Eye className="w-4 h-4" />
            View Details
          </button>

          {user && (
            <button
              onClick={handleSaveToggle}
              disabled={isLoading}
              className={`px-3 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center justify-center transform ${isLoading ? 'scale-95 opacity-75' : 'scale-100 opacity-100'
                } ${isSaved
                  ? 'secondary-gradient text-white shadow-lg hover:shadow-xl'
                  : 'border border-gray-300 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 hover:scale-105'
                }`}
            >
              <div className={`transition-transform duration-200 ${isLoading ? 'animate-pulse' : ''}`}>
                {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompactJobCard;
