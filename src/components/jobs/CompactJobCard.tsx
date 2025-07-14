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
      <Card className="relative bg-white border-2 border-primary/20 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 group h-[420px] flex flex-col">
        {/* Simple featured indicator */}
        <div className="absolute -top-2 -right-2">
          <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
            Featured
          </div>
        </div>

        {/* Header */}
        <div className="flex-shrink-0 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Badge className={`${getJobTypeColor(job.job_type)} font-semibold px-3 py-1 text-sm`}>
              {job.job_type}
            </Badge>
            {job.is_remote && (
              <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                <Globe className="w-3 h-3 mr-1" />
                Remote
              </Badge>
            )}
          </div>
          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
            {truncateText(job.title, 55)}
          </h3>
        </div>

        {/* Institution and Location */}
        <div className="flex-shrink-0 mb-4 space-y-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm truncate">{job.institution}</p>
              {job.department && (
                <p className="text-xs text-muted-foreground truncate">{job.department}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{job.location}</p>
          </div>
          {job.pi_name && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                <span className="font-medium">PI:</span> {truncateText(job.pi_name, 25)}
              </span>
            </div>
          )}
        </div>

        {/* Tags */}
        {job.job_tags && job.job_tags.length > 0 && (
          <div className="flex-shrink-0 flex flex-wrap gap-2 mb-4">
            {job.job_tags.slice(0, 4).map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                {tag.tag}
              </Badge>
            ))}
            {job.job_tags.length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{job.job_tags.length - 4} more
              </Badge>
            )}
          </div>
        )}

        {/* Description Preview */}
        <div className="flex-grow mb-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {truncateText(job.description, 150)}
          </p>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              {job.application_deadline && (
                <div className="flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full">
                  <Calendar className="w-3 h-3" />
                  <span>Due {formatDate(job.application_deadline)}</span>
                </div>
              )}
              {job.duration && (
                <div className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                  <Clock className="w-3 h-3" />
                  <span>{job.duration}</span>
                </div>
              )}
            </div>
          </div>
          <Button 
            onClick={() => onViewDetails(job)}
            size="sm"
            className="w-full mt-3 font-medium"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
        </div>
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
