
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Building2, Calendar, Eye, User, Sparkles } from 'lucide-react';
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
      case 'phd': return 'bg-blue-500 text-white border-blue-600';
      case 'postdoc': return 'bg-emerald-500 text-white border-emerald-600';
      case 'faculty': return 'bg-purple-500 text-white border-purple-600';
      case 'ra': return 'bg-orange-500 text-white border-orange-600';
      case 'internship': return 'bg-pink-500 text-white border-pink-600';
      default: return 'bg-slate-500 text-white border-slate-600';
    }
  };

  return (
    <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 ${
      job.is_featured 
        ? 'bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-lg ring-2 ring-amber-200' 
        : 'bg-white shadow-md hover:shadow-xl'
    }`}>
      {job.is_featured && (
        <div className="absolute top-0 right-0 w-0 h-0 border-l-[50px] border-l-transparent border-t-[50px] border-t-amber-400">
          <Sparkles className="absolute -top-9 -right-1 w-4 h-4 text-white" />
        </div>
      )}
      
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header with Job Type Badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Badge className={`${getJobTypeColor(job.job_type)} font-semibold px-3 py-1 shadow-sm`}>
                  {job.job_type}
                </Badge>
                {job.is_remote && (
                  <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
                    Remote
                  </Badge>
                )}
              </div>
              
              <h3 className="font-bold text-xl text-gray-900 leading-tight mb-3 group-hover:text-indigo-700 transition-colors">
                {truncateText(job.title, 65)}
              </h3>
            </div>
          </div>

          {/* Institution & Department */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-700">
              <Building2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <span className="font-semibold">{job.institution}</span>
              {job.department && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm">{truncateText(job.department, 25)}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>{job.location}</span>
            </div>

            {job.pi_name && (
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <span className="text-sm">
                  <span className="font-medium">PI:</span> {job.pi_name}
                </span>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {job.job_tags.slice(0, 4).map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-xs bg-gray-50 hover:bg-gray-100 transition-colors">
                #{tag.tag}
              </Badge>
            ))}
            {job.job_tags.length > 4 && (
              <Badge variant="outline" className="text-xs text-gray-500 bg-gray-50">
                +{job.job_tags.length - 4} more
              </Badge>
            )}
          </div>

          {/* Description Preview */}
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-sm text-gray-700 leading-relaxed">
              {truncateText(job.description, 140)}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              {job.application_deadline && (
                <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                  <Calendar className="w-3 h-3" />
                  <span className="font-medium">Due {formatDate(job.application_deadline)}</span>
                </div>
              )}
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onViewDetails(job)}
              className="flex items-center gap-2 bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Eye className="w-4 h-4" />
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompactJobCard;
