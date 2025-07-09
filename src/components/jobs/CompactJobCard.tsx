
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
      case 'phd': return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-200';
      case 'postdoc': return 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-200';
      case 'faculty': return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-purple-200';
      case 'ra': return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-200';
      case 'internship': return 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-pink-200';
      default: return 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-slate-200';
    }
  };

  return (
    <Card className={`group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border-0 ${
      job.is_featured 
        ? 'bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-xl ring-2 ring-amber-200 hover:ring-amber-300' 
        : 'bg-white shadow-lg hover:shadow-2xl'
    }`}>
      {/* Featured ribbon */}
      {job.is_featured && (
        <div className="absolute -right-3 top-6 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-8 py-1 text-xs font-bold transform rotate-12 shadow-lg">
          <Sparkles className="inline w-3 h-3 mr-1" />
          FEATURED
        </div>
      )}
      
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-indigo-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <CardContent className="p-0 relative">
        {/* Header section with colored background */}
        <div className={`px-6 py-4 ${job.is_featured ? 'bg-gradient-to-r from-amber-50 to-orange-50' : 'bg-gradient-to-r from-slate-50 to-gray-50'} border-b border-gray-100`}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Badge className={`${getJobTypeColor(job.job_type)} font-bold px-4 py-1.5 shadow-lg text-sm`}>
                {job.job_type}
              </Badge>
              {job.is_remote && (
                <Badge variant="outline" className="border-2 border-green-500 text-green-700 bg-green-50 font-semibold px-3 py-1">
                  <Globe className="w-3 h-3 mr-1" />
                  Remote
                </Badge>
              )}
            </div>
          </div>
          
          <h3 className="font-bold text-xl text-gray-900 leading-tight group-hover:text-indigo-700 transition-colors duration-300">
            {truncateText(job.title, 60)}
          </h3>
        </div>

        {/* Main content */}
        <div className="px-6 py-5 space-y-4">
          {/* Institution & Location */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Building2 className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{job.institution}</div>
                {job.department && (
                  <div className="text-sm text-gray-600 truncate">{job.department}</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-gray-700 font-medium">{job.location}</span>
            </div>

            {job.pi_name && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <User className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-gray-700">
                  <span className="font-medium">Principal Investigator:</span> {job.pi_name}
                </span>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {job.job_tags.slice(0, 3).map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-xs bg-gradient-to-r from-gray-50 to-slate-50 hover:from-gray-100 hover:to-slate-100 transition-all duration-200 border-gray-200">
                #{tag.tag}
              </Badge>
            ))}
            {job.job_tags.length > 3 && (
              <Badge variant="outline" className="text-xs text-gray-500 bg-gray-50 border-gray-200">
                +{job.job_tags.length - 3} more
              </Badge>
            )}
          </div>

          {/* Description Preview */}
          <div className="bg-gradient-to-br from-slate-50 via-white to-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-700 leading-relaxed font-medium">
              {truncateText(job.description, 120)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-slate-50 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {job.application_deadline && (
                <div className="flex items-center gap-2 text-xs bg-red-50 text-red-700 px-3 py-2 rounded-full border border-red-200">
                  <Calendar className="w-3 h-3" />
                  <span className="font-semibold">Due {formatDate(job.application_deadline)}</span>
                </div>
              )}
              {job.duration && (
                <div className="flex items-center gap-2 text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-full border border-blue-200">
                  <Clock className="w-3 h-3" />
                  <span className="font-medium">{job.duration}</span>
                </div>
              )}
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onViewDetails(job)}
              className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 text-indigo-700 hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-300 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompactJobCard;
