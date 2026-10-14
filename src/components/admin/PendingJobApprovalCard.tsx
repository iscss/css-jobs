import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Briefcase, User, Calendar, MapPin, Building2, CheckCircle, XCircle, Eye, Mail, Bot, ExternalLink, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import JobDetailsModal from '@/components/jobs/JobDetailsModal';
import type { Tables } from '@/integrations/supabase/types';

type Job = Tables<'jobs'> & {
  job_tags: { id: string; tag: string; }[];
  user_profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
};

interface PendingJobApprovalCardProps {
  job: Job;
}

// The score only orders the queue, so the colours are a hint, not a verdict:
// every imported job stays reviewable regardless of where it lands.
const relevanceTone = (score: number) => {
  if (score >= 0.5) return 'border-green-300 text-green-700 bg-green-50';
  if (score >= 0.25) return 'border-amber-300 text-amber-700 bg-amber-50';
  return 'border-gray-300 text-gray-600 bg-gray-50';
};

const PendingJobApprovalCard = ({ job }: PendingJobApprovalCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Provenance for automatically imported postings. Admins need the link to
  // the original listing to judge whether an import is genuine.
  const isImported = job.is_auto_imported === true;
  const sourceUrl = job.source_url;
  const sourceName = job.source;
  const relevanceScore =
    job.relevance_score === null || job.relevance_score === undefined
      ? null
      : Number(job.relevance_score);
  const relevanceReasoning = job.relevance_reasoning;
  const postedAt = job.posted_at;
  const deadline = job.application_deadline;

  // Age matters as much as relevance: some feeds keep listings for years, so
  // a perfect keyword match can still be a role that closed long ago.
  const ageDays = postedAt
    ? Math.floor((Date.now() - new Date(postedAt).getTime()) / 86400000)
    : null;
  const deadlinePassed = deadline
    ? new Date(deadline).getTime() < Date.now()
    : false;

  const formatAge = (days: number) => {
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.round(days / 30)}mo ago`;
    return `${(days / 365).toFixed(1)}y ago`;
  };

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    
    const now = new Date();
    const submitted = new Date(dateString);
    const diffMs = now.getTime() - submitted.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Recently';
    }
  };

  const handleJobApproval = (action: 'approve' | 'reject') => {
    setApprovalAction(action);
    setApprovalDialogOpen(true);
  };

  const confirmJobApproval = async () => {
    if (!approvalAction) return;
    
    setIsProcessing(true);
    try {
      if (approvalAction === 'approve') {
        // Approve the job and publish it
        const { error: jobError } = await supabase
          .from('jobs')
          .update({
            approval_status: 'approved',
            is_published: true,
            approved_at: new Date().toISOString(),
            approved_by_admin: user?.id
          })
          .eq('id', job.id);

        if (jobError) throw jobError;

        // Increment the user's approved jobs count
        const { error: counterError } = await supabase.rpc('increment_approved_jobs_count', {
          user_id: job.posted_by
        });

        // Log but don't fail if counter update fails
        if (counterError) {
          console.warn('Failed to increment approved jobs count:', counterError);
        }

        toast({
          title: "Job Approved",
          description: "The job has been approved and published successfully.",
        });
      } else {
        // Reject the job
        const { error } = await supabase
          .from('jobs')
          .update({ 
            approval_status: 'rejected',
            approved_at: new Date().toISOString(),
            approved_by_admin: user?.id
          })
          .eq('id', job.id);

        if (error) throw error;
        
        toast({
          title: "Job Rejected",
          description: "The job has been rejected and the user has been notified.",
        });
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['all-jobs-admin'] });
      queryClient.invalidateQueries({ queryKey: ['pending-jobs-admin'] });
      // Invalidate the job poster's personal cache so their view updates immediately
      queryClient.invalidateQueries({ queryKey: ['user-jobs', job.posted_by] });
      queryClient.invalidateQueries({ queryKey: ['user-profile', job.posted_by] });

    } catch (error) {
      console.error('Error processing job approval:', error);
      toast({
        title: `Error ${approvalAction === 'approve' ? 'approving' : 'rejecting'} job`,
        description: `There was an error ${approvalAction === 'approve' ? 'approving' : 'rejecting'} the job. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setApprovalDialogOpen(false);
      setApprovalAction(null);
    }
  };

  return (
    <>
      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                <Briefcase className="w-6 h-6 text-orange-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 truncate pr-2">{job.title}</h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {isImported && relevanceScore !== null && (
                      <Badge
                        variant="outline"
                        className={`shrink-0 ${relevanceTone(relevanceScore)}`}
                        title={relevanceReasoning ?? undefined}
                      >
                        {Math.round(relevanceScore * 100)}% match
                      </Badge>
                    )}
                    <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-100 shrink-0">
                      Pending Job Approval
                    </Badge>
                  </div>
                </div>

                {isImported && (
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                    {ageDays !== null && (
                      <Badge
                        variant="outline"
                        className={
                          ageDays > 365
                            ? 'border-red-300 text-red-700 bg-red-50'
                            : ageDays > 180
                            ? 'border-amber-300 text-amber-700 bg-amber-50'
                            : 'border-gray-300 text-gray-600 bg-gray-50'
                        }
                        title={`Posted ${postedAt}`}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {formatAge(ageDays)}
                      </Badge>
                    )}
                    {deadline && (
                      <Badge
                        variant="outline"
                        className={
                          deadlinePassed
                            ? 'border-red-300 text-red-700 bg-red-50'
                            : 'border-green-300 text-green-700 bg-green-50'
                        }
                      >
                        {deadlinePassed ? 'Closed ' : 'Closes '}
                        {deadline}
                      </Badge>
                    )}
                    <Badge variant="outline" className="border-brand-navy/30 text-brand-navy bg-brand-surface">
                      <Bot className="w-3 h-3 mr-1" />
                      Auto-imported
                    </Badge>
                    {sourceUrl && (
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-brand-navy hover:underline"
                      >
                        View original{sourceName ? ` on ${sourceName}` : ''}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 className="w-4 h-4" />
                      <span className="truncate">{job.institution}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{job.location}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span className="truncate">
                        {job.user_profiles?.full_name || 'Unknown User'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">
                        {job.user_profiles?.email || 'No email'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Submitted {formatTimeAgo((job as Record<string, unknown>).submitted_for_approval_at as string | null)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{job.job_type}</Badge>
                  {job.job_tags.map((tag) => (
                    <Badge key={tag.id} variant="outline" className="text-xs">
                      {tag.tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedJob(job)}
                className="min-w-[80px]"
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
              <Button
                size="sm"
                onClick={() => handleJobApproval('approve')}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700 text-white min-w-[80px]"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleJobApproval('reject')}
                disabled={isProcessing}
                className="min-w-[80px]"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}

      <AlertDialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {approvalAction === 'approve' ? 'Approve Job Post' : 'Reject Job Post'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {approvalAction} the job post "{job.title}"? 
              {approvalAction === 'approve' 
                ? ' This will publish the job to the job board and increment the user\'s approved job count.'
                : ' This will reject the job and it will not be published.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmJobApproval}
              disabled={isProcessing}
              className={approvalAction === 'approve' 
                ? "bg-green-600 text-white hover:bg-green-700" 
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
            >
              {isProcessing 
                ? (approvalAction === 'approve' ? 'Approving...' : 'Rejecting...')
                : (approvalAction === 'approve' ? 'Approve Job' : 'Reject Job')
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PendingJobApprovalCard;