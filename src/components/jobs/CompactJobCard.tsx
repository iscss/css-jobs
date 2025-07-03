
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Building2, Calendar, Eye } from 'lucide-react';
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

  return (
    <Card className="h-full hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-indigo-300">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-lg text-gray-900 leading-tight">
                {truncateText(job.title, 60)}
              </h3>
              {job.is_featured && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 shrink-0">
                  Featured
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building2 className="w-4 h-4" />
              <span className="font-medium">{job.institution}</span>
              {job.department && (
                <>
                  <span>•</span>
                  <span>{truncateText(job.department, 30)}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{job.location}</span>
              {job.is_remote && (
                <Badge variant="outline" className="text-xs">
                  Remote
                </Badge>
              )}
            </div>
          </div>

          {/* Job Type and Tags */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="default" className="bg-indigo-100 text-indigo-800">
              {job.job_type}
            </Badge>
            {job.job_tags.slice(0, 3).map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-xs">
                {tag.tag}
              </Badge>
            ))}
            {job.job_tags.length > 3 && (
              <Badge variant="outline" className="text-xs text-gray-500">
                +{job.job_tags.length - 3}
              </Badge>
            )}
          </div>

          {/* Description Preview */}
          <p className="text-sm text-gray-600 leading-relaxed">
            {truncateText(job.description, 120)}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {job.application_deadline && (
                <>
                  <Calendar className="w-3 h-3" />
                  <span>Due {formatDate(job.application_deadline)}</span>
                </>
              )}
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onViewDetails(job)}
              className="flex items-center gap-2"
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
