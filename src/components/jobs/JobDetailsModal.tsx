
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MapPin, Building2, Calendar, ExternalLink, Mail, User, DollarSign, Clock, Bookmark, BookmarkCheck } from 'lucide-react';
import { useSaveJob, useUnsaveJob, useCheckSavedJob } from '@/hooks/useSavedJobs';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';
import LinkifiedText from './LinkifiedText';
import { parseStructured } from '@/lib/structured';

type Job = Tables<'jobs'> & {
  job_tags: { id: string; tag: string; }[]
};

interface JobDetailsModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}

const JobDetailsModal = ({ job, isOpen, onClose }: JobDetailsModalProps) => {
  const { user } = useAuth();
  const { data: isSaved } = useCheckSavedJob(job?.id || '');
  const saveJob = useSaveJob();
  const unsaveJob = useUnsaveJob();
  const [showOriginal, setShowOriginal] = useState(false);

  if (!job) return null;

  // The organised copy, when the AI sweep has made one; otherwise the original.
  const organised = parseStructured(job.structured);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleSaveToggle = () => {
    if (!user) return;
    
    if (isSaved) {
      unsaveJob.mutate(job.id);
    } else {
      saveJob.mutate(job.id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 pr-8">
            {job.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex flex-wrap gap-4 items-center text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              <span className="font-medium">{job.institution}</span>
            </div>
            {job.department && (
              <div className="flex items-center gap-1">
                <span>•</span>
                <span>{job.department}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{job.location}</span>
              {job.is_remote && <Badge variant="secondary" className="ml-1">Remote</Badge>}
            </div>
          </div>

          {/* Job Type and Tags */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="default" className="bg-brand-surface-2 text-brand-navy">
              {job.job_type}
            </Badge>
            {job.job_tags.map((tag) => (
              <Badge key={tag.id} variant="outline">
                {tag.tag}
              </Badge>
            ))}
          </div>

          <Separator />

          {/* Description: organised into sections when available, with a way back to the original */}
          {organised && !showOriginal ? (
            <div className="space-y-5">
              {organised.pay_range && (
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Pay</p>
                    <p className="text-gray-700">{organised.pay_range}</p>
                  </div>
                </div>
              )}
              {organised.sections.map((section, i) => (
                <div key={i}>
                  <h3 className="text-lg font-semibold mb-3">{section.heading}</h3>
                  <div className="prose prose-sm max-w-none">
                    <LinkifiedText text={section.text} className="whitespace-pre-wrap text-gray-700" />
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="px-0 text-gray-500" onClick={() => setShowOriginal(true)}>
                Show original posting
              </Button>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-3">Description</h3>
              <div className="prose prose-sm max-w-none">
                <LinkifiedText text={job.description} className="whitespace-pre-wrap text-gray-700" />
              </div>
              {organised && (
                <Button variant="ghost" size="sm" className="px-0 mt-2 text-gray-500" onClick={() => setShowOriginal(false)}>
                  Show organised view
                </Button>
              )}
            </div>
          )}

          {/* Requirements */}
          {job.requirements && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Requirements</h3>
              <div className="prose prose-sm max-w-none">
                <LinkifiedText text={job.requirements} className="whitespace-pre-wrap text-gray-700" />
              </div>
            </div>
          )}

          <Separator />

          {/* Details Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Position Details</h3>
              
              {job.application_deadline && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Application Deadline</p>
                    <p className="text-gray-600">{formatDate(job.application_deadline)}</p>
                  </div>
                </div>
              )}

              {job.duration && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Duration</p>
                    <p className="text-gray-600">{job.duration}</p>
                  </div>
                </div>
              )}

              {job.funding_source && (
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Funding Source</p>
                    <p className="text-gray-600">{job.funding_source}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact Information</h3>
              
              {job.pi_name && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Principal Investigator</p>
                    <p className="text-gray-600">{job.pi_name}</p>
                  </div>
                </div>
              )}

              {job.contact_email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Contact Email</p>
                    <a 
                      href={`mailto:${job.contact_email}`}
                      className="text-brand-navy hover:text-brand-navy transition-colors"
                    >
                      {job.contact_email}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-wrap gap-3">
            {job.application_url && (
              <Button asChild>
                <a 
                  href={job.application_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Apply for this Position
                </a>
              </Button>
            )}
            
            {!job.application_url && organised?.application_link && (
              <Button asChild>
                <a
                  href={organised.application_link}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Apply (link from the posting)
                </a>
              </Button>
            )}

            {!job.application_url && job.contact_email && (
              <Button asChild>
                <a
                  href={`mailto:${job.contact_email}?subject=${encodeURIComponent(`Application for ${job.title}`)}`}
                  className="flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Apply by email
                </a>
              </Button>
            )}

            {user && (
              <Button
                variant="outline"
                onClick={handleSaveToggle}
                disabled={saveJob.isPending || unsaveJob.isPending}
                className="flex items-center gap-2"
              >
                {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                {isSaved ? 'Saved' : 'Save Job'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobDetailsModal;
