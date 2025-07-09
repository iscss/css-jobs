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
      <Card className="group relative overflow-hidden h-[420px] flex flex-col bg-gradient-to-br from-orange-50 via-pink-50 to-purple-100 border-2 border-orange-200 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
        {/* Bright featured indicator */}
        <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden">
          <div className="absolute top-2 right-[-22px] bg-gradient-to-r from-orange-400 via-pink-400 to-purple-500 text-white px-8 py-2 text-xs font-bold transform rotate-45 shadow-md">
            ⭐ FEATURED
          </div>
        </div>

        {/* Bright accent line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 via-pink-400 to-purple-500"></div>
        
        <CardContent className="p-6 flex flex-col h-full">
          {/* Header section */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Badge className={`${getJobTypeColor(job.job_type)} font-bold px-3 py-1 text-sm shadow-sm`}>
                {job.job_type}
              </Badge>
              {job.is_remote && (
                <Badge className="bg-green-100 text-green-700 border-green-300 font-medium px-3 py-1">
                  <Globe className="w-3 h-3 mr-1" />
                  Remote
                </Badge>
              )}
            </div>
            
            <h3 className="font-bold text-lg text-gray-900 leading-tight mb-3 group-hover:text-purple-700 transition-colors">
              {truncateText(job.title, 50)}
            </h3>

            {/* Institution & Location */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-orange-100 rounded-lg flex-shrink-0">
                  <Building2 className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm truncate">{job.institution}</div>
                  {job.department && (
                    <div className="text-xs text-gray-600 truncate">{job.department}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-pink-100 rounded-lg flex-shrink-0">
                  <MapPin className="w-4 h-4 text-pink-600" />
                </div>
                <span className="text-gray-700 font-medium text-sm">{job.location}</span>
              </div>

              {job.pi_name && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 rounded-lg flex-shrink-0">
                    <User className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-gray-700 text-sm">
                    <span className="font-medium text-gray-900">PI:</span> {truncateText(job.pi_name, 20)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Content section */}
          <div className="flex-grow flex flex-col">
            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {job.job_tags.slice(0, 3).map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs bg-white/80 border-gray-300 text-gray-700 hover:bg-white transition-colors">
                  #{tag.tag}
                </Badge>
              ))}
              {job.job_tags.length > 3 && (
                <Badge variant="outline" className="text-xs text-gray-500 bg-white/80 border-gray-300">
                  +{job.job_tags.length - 3}
                </Badge>
              )}
            </div>

            {/* Description Preview */}
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 mb-4 flex-grow border border-white/50">
              <p className="text-sm text-gray-700 leading-relaxed">
                {truncateText(job.description, 120)}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {job.application_deadline && (
                  <div className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-full border border-red-200">
                    <Calendar className="w-3 h-3" />
                    <span className="font-medium">Due {formatDate(job.application_deadline)}</span>
                  </div>
                )}
                {job.duration && (
                  <div className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200">
                    <Clock className="w-3 h-3" />
                    <span className="font-medium">{job.duration}</span>
                  </div>
                )}
              </div>
            </div>
            
            <Button 
              onClick={() => onViewDetails(job)}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 border-0"
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
