import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Building2, Calendar, Eye, User, Sparkles, Clock, Globe } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Job = Tables<'jobs'> & {
  job_tags: { id: string; tag: string; }[]
};

interface CompactJobCardProps {
  job: Job;
  onViewDetails: (job: Job) => void;
}

const CompactJobCard = ({ job, onViewDetails }: CompactJobCardProps) => {
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

  if (job.is_featured) {
    return (
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-xl"></div>
        <div className="relative bg-white/95 backdrop-blur-sm border border-violet-200/50 rounded-2xl p-6 hover:border-violet-300/70 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-lg min-h-[380px] flex flex-col">
          
          {/* Featured badge */}
          <div className="absolute -top-2 -right-2 z-10">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
              ✨ Featured
            </div>
          </div>

          {/* Header */}
          <div className="flex-shrink-0 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="px-3 py-1 bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 rounded-full text-sm font-medium border border-violet-200">
                {job.job_type}
              </div>
              {job.is_remote && (
                <div className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium border border-emerald-200">
                  Remote
                </div>
              )}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 group-hover:text-violet-700 transition-colors leading-tight">
              {truncateText(job.title, 60)}
            </h3>
          </div>

          {/* Institution info */}
          <div className="flex-shrink-0 mb-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-violet-100 to-purple-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-base">{job.institution}</p>
                {job.department && (
                  <p className="text-gray-600 text-sm mt-0.5">{job.department}</p>
                )}
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-600 text-sm">{job.location}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {job.job_tags && job.job_tags.length > 0 && (
            <div className="flex-shrink-0 mb-4">
              <div className="flex flex-wrap gap-2">
                {job.job_tags.slice(0, 4).map((tag) => (
                  <span key={tag.id} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                    {tag.tag}
                  </span>
                ))}
                {job.job_tags.length > 4 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-md text-xs">
                    +{job.job_tags.length - 4}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="flex-1 mb-6">
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
              {truncateText(job.description, 140)}
            </p>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 space-y-3">
            {(job.application_deadline || job.duration) && (
              <div className="flex flex-wrap gap-2">
                {job.application_deadline && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    Due {formatDate(job.application_deadline)}
                  </div>
                )}
                {job.duration && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {job.duration}
                  </div>
                )}
              </div>
            )}
            
            <button 
              onClick={() => onViewDetails(job)}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-md transition-all duration-200 group min-h-[320px] flex flex-col">
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
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-gray-400" />
              <p className="text-gray-600 text-sm">{job.location}</p>
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
        
        <button 
          onClick={() => onViewDetails(job)}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          View Details
        </button>
      </div>
    </div>
  );
};

export default CompactJobCard;
