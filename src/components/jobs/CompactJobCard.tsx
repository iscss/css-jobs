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
      <Card className="group relative overflow-hidden h-[420px] flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-2">
        {/* Elegant featured indicator */}
        <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden">
          <div className="absolute top-3 right-[-20px] bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 text-slate-900 px-8 py-1 text-xs font-bold transform rotate-45 shadow-lg">
            ✦ FEATURED
          </div>
        </div>

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-indigo-500/10 pointer-events-none"></div>
        
        <CardContent className="p-0 flex flex-col h-full relative z-10">
          {/* Header section */}
          <div className="p-6 pb-4 flex-shrink-0">
            <div className="flex items-center gap-3 mb-4">
              <Badge className={`${getJobTypeColor(job.job_type)} font-bold px-4 py-2 text-sm shadow-lg`}>
                {job.job_type}
              </Badge>
              {job.is_remote && (
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 font-medium px-3 py-2 backdrop-blur-sm">
                  <Globe className="w-3 h-3 mr-1" />
                  Remote
                </Badge>
              )}
            </div>
            
            <h3 className="font-bold text-xl text-white leading-tight mb-4 group-hover:text-yellow-200 transition-colors duration-300">
              {truncateText(job.title, 45)}
            </h3>

            {/* Institution & Location */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg flex-shrink-0 border border-white/20">
                  <Building2 className="w-4 h-4 text-yellow-200" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm">{job.institution}</div>
                  {job.department && (
                    <div className="text-xs text-slate-300">{truncateText(job.department, 25)}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg flex-shrink-0 border border-white/20">
                  <MapPin className="w-4 h-4 text-emerald-300" />
                </div>
                <span className="text-slate-200 font-medium text-sm">{job.location}</span>
              </div>

              {job.pi_name && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg flex-shrink-0 border border-white/20">
                    <User className="w-4 h-4 text-purple-300" />
                  </div>
                  <span className="text-slate-200 text-sm">
                    <span className="font-medium text-white">PI:</span> {truncateText(job.pi_name, 18)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Content section */}
          <div className="px-6 pb-4 flex-grow flex flex-col">
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {job.job_tags.slice(0, 3).map((tag) => (
                <Badge key={tag.id} className="bg-white/10 text-white border-white/20 text-xs backdrop-blur-sm hover:bg-white/20 transition-colors">
                  #{tag.tag}
                </Badge>
              ))}
              {job.job_tags.length > 3 && (
                <Badge className="bg-white/10 text-slate-300 border-white/20 text-xs backdrop-blur-sm">
                  +{job.job_tags.length - 3}
                </Badge>
              )}
            </div>

            {/* Description Preview */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 mb-4 flex-grow border border-white/10">
              <p className="text-sm text-slate-200 leading-relaxed">
                {truncateText(job.description, 75)}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-black/20 backdrop-blur-sm border-t border-white/10 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {job.application_deadline && (
                  <div className="flex items-center gap-1 text-xs bg-red-500/20 text-red-300 px-3 py-1.5 rounded-full border border-red-400/30 backdrop-blur-sm">
                    <Calendar className="w-3 h-3" />
                    <span className="font-medium">Due {formatDate(job.application_deadline)}</span>
                  </div>
                )}
                {job.duration && (
                  <div className="flex items-center gap-1 text-xs bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-full border border-blue-400/30 backdrop-blur-sm">
                    <Clock className="w-3 h-3" />
                    <span className="font-medium">{job.duration}</span>
                  </div>
                )}
              </div>
            </div>
            
            <Button 
              onClick={() => onViewDetails(job)}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-slate-900 hover:from-yellow-300 hover:to-orange-300 transition-all duration-200 font-bold shadow-lg hover:shadow-xl border-0"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 h-[420px] flex flex-col bg-white shadow-md hover:shadow-xl">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Header section */}
        <div className="p-4 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Badge className={`${getJobTypeColor(job.job_type)} font-semibold px-3 py-1 text-sm`}>
              {job.job_type}
            </Badge>
            {job.is_remote && (
              <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50 font-medium px-2 py-1">
                <Globe className="w-3 h-3 mr-1" />
                Remote
              </Badge>
            )}
          </div>
          
          <h3 className="font-bold text-lg text-gray-900 leading-tight mb-3 group-hover:text-indigo-700 transition-colors duration-200">
            {truncateText(job.title, 50)}
          </h3>

          {/* Institution & Location - more compact */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 rounded-md flex-shrink-0">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm truncate">{job.institution}</div>
                {job.department && (
                  <div className="text-xs text-gray-600 truncate">{job.department}</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-100 rounded-md flex-shrink-0">
                <MapPin className="w-3.5 h-3.5 text-green-600" />
              </div>
              <span className="text-gray-700 font-medium text-sm">{job.location}</span>
            </div>

            {job.pi_name && (
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-100 rounded-md flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <span className="text-gray-700 text-sm">
                  <span className="font-medium">PI:</span> {truncateText(job.pi_name, 20)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content section - flexible */}
        <div className="px-4 pb-3 flex-grow flex flex-col">
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {job.job_tags.slice(0, 3).map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-xs bg-gray-50 hover:bg-gray-100 transition-colors border-gray-200">
                #{tag.tag}
              </Badge>
            ))}
            {job.job_tags.length > 3 && (
              <Badge variant="outline" className="text-xs text-gray-500 bg-gray-50 border-gray-200">
                +{job.job_tags.length - 3}
              </Badge>
            )}
          </div>

          {/* Description Preview */}
          <div className="bg-slate-50 rounded-lg p-3 mb-4 flex-grow">
            <p className="text-sm text-gray-700 leading-relaxed">
              {truncateText(job.description, 80)}
            </p>
          </div>
        </div>

        {/* Footer - fixed at bottom */}
        <div className="px-4 py-3 bg-slate-50 border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {job.application_deadline && (
                <div className="flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full border border-red-200">
                  <Calendar className="w-3 h-3" />
                  <span className="font-medium">Due {formatDate(job.application_deadline)}</span>
                </div>
              )}
              {job.duration && (
                <div className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-200">
                  <Clock className="w-3 h-3" />
                  <span className="font-medium">{job.duration}</span>
                </div>
              )}
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onViewDetails(job)}
            className="w-full bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200 font-medium"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompactJobCard;
