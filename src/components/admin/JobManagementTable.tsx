
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
import { useAllJobs, useRetractJob, useToggleFeatured, useDeleteJob, useUpdateJobStatus } from '@/hooks/useJobManagement';
import { Briefcase, Eye, EyeOff, Star, StarOff, Trash2, MoreHorizontal, User, Building2, Calendar, MapPin, CheckCircle, XCircle, Mail, Send, Pause, RefreshCw } from 'lucide-react';
import JobDetailsModal from '@/components/jobs/JobDetailsModal';
import type { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

type Job = Tables<'jobs'> & {
  job_tags: { id: string; tag: string; }[]
};

const JobManagementTable = () => {
  const { data: allJobs, isLoading } = useAllJobs();
  const retractJob = useRetractJob();
  const toggleFeatured = useToggleFeatured();
  const deleteJob = useDeleteJob();
  const updateJobStatus = useUpdateJobStatus();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<{ jobId: string; action: 'approve' | 'reject'; jobTitle: string } | null>(null);
  const [notificationSending, setNotificationSending] = useState<string | null>(null);

  const handleRetractJob = (jobId: string, currentStatus: boolean, postedBy: string) => {
    retractJob.mutate({
      jobId,
      isPublished: !currentStatus,
      postedBy
    });
  };

  const handleToggleFeatured = (jobId: string, currentStatus: boolean) => {
    toggleFeatured.mutate({
      jobId,
      isFeatured: !currentStatus
    });
  };

  const handleUpdateJobStatus = (jobId: string, status: 'active' | 'filled' | 'inactive', postedBy: string) => {
    updateJobStatus.mutate({
      jobId,
      jobStatus: status,
      postedBy
    });
  };

  const handleDeleteJob = (job: Job) => {
    setJobToDelete(job);
    setDeleteDialogOpen(true);
  };

  const handleJobApproval = (jobId: string, action: 'approve' | 'reject', jobTitle: string) => {
    setApprovalAction({ jobId, action, jobTitle });
    setApprovalDialogOpen(true);
  };

  const confirmJobApproval = async () => {
    if (!approvalAction) return;

    try {
      if (approvalAction.action === 'approve') {
        // Call our database function to approve job and update user counter
        const { error } = await supabase.rpc('approve_job_and_update_counter', {
          job_id: approvalAction.jobId,
          admin_id: user?.id
        });

        if (error) throw error;

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
          .eq('id', approvalAction.jobId);

        if (error) throw error;

        toast({
          title: "Job Rejected",
          description: "The job has been rejected and the user has been notified.",
        });
      }

      // Get the job data to find the posted_by user ID
      const jobToApprove = allJobs?.find(job => job.id === approvalAction.jobId);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['all-jobs-admin'] });
      queryClient.invalidateQueries({ queryKey: ['pending-jobs-admin'] });
      // Invalidate the job poster's personal cache so their view updates immediately
      if (jobToApprove?.posted_by) {
        queryClient.invalidateQueries({ queryKey: ['user-jobs', jobToApprove.posted_by] });
        queryClient.invalidateQueries({ queryKey: ['user-profile', jobToApprove.posted_by] });
      }
    } catch (error) {
      console.error('Error processing job approval:', error);
      toast({
        title: `Error ${approvalAction.action === 'approve' ? 'approving' : 'rejecting'} job`,
        description: `There was an error ${approvalAction.action === 'approve' ? 'approving' : 'rejecting'} the job. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setApprovalDialogOpen(false);
      setApprovalAction(null);
    }
  };

  const handleSendNotification = async (jobId: string, jobTitle: string) => {
    try {
      setNotificationSending(jobId);

      // Get job poster's email for notification
      const { data: jobData, error: fetchError } = await supabase
        .from('jobs')
        .select(`
          *,
          user_profiles!jobs_posted_by_fkey (
            email,
            full_name
          )
        `)
        .eq('id', jobId)
        .single();

      if (fetchError) throw fetchError;

      // Update job with notification sent timestamp
      const { error } = await supabase
        .from('jobs')
        .update({
          notification_sent_at: new Date().toISOString(),
          notification_sent_by: user?.id
        })
        .eq('id', jobId);

      if (error) throw error;

      // Queue the actual email notification
      const posterEmail = (jobData as Record<string, unknown>).user_profiles?.email;
      const posterName = (jobData as Record<string, unknown>).user_profiles?.full_name;
      
      if (posterEmail) {
        const { error: emailError } = await supabase
          .from('email_queue')
          .insert({
            recipient_email: posterEmail,
            subject: `Your job posting "${jobTitle}" has been approved!`,
            html_content: `
              <h2>Job Posting Approved!</h2>
              <p>Hello ${posterName || 'there'},</p>
              <p>Your job posting "<strong>${jobTitle}</strong>" has been approved and is now live on our job board.</p>
              <p>You can view and manage your job postings in your profile dashboard.</p>
              <p>Best regards,<br>The CSS Jobs Team</p>
            `,
            template_type: 'job_alert',
            job_id: jobId,
            user_id: jobData.posted_by
          });

        if (emailError) {
          console.error('Error queueing email:', emailError);
        }
      }
      
      toast({
        title: "Notification Sent",
        description: `Job approval notification queued for ${posterName} (${posterEmail}) for "${jobTitle}".`,
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['all-jobs-admin'] });
      queryClient.invalidateQueries({ queryKey: ['pending-jobs-admin'] });
      // Also invalidate the specific job poster's cache
      if (jobData?.posted_by) {
        queryClient.invalidateQueries({ queryKey: ['user-jobs', jobData.posted_by] });
        queryClient.invalidateQueries({ queryKey: ['user-profile', jobData.posted_by] });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: "Error sending notification",
        description: "There was an error sending the notification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setNotificationSending(null);
    }
  };

  const confirmDeleteJob = () => {
    if (!jobToDelete) return;
    
    deleteJob.mutate(jobToDelete.id);
    setDeleteDialogOpen(false);
    setJobToDelete(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Job Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-3 text-xl">
          <Briefcase className="w-6 h-6" />
          All Job Posts ({allJobs?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="pl-6 py-4 font-semibold">Job Details</TableHead>
              <TableHead className="py-4 font-semibold">Posted By</TableHead>
              <TableHead className="py-4 font-semibold">Type & Status</TableHead>
              <TableHead className="py-4 font-semibold">Posted Date</TableHead>
              <TableHead className="pr-6 py-4 font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allJobs?.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())?.map((job) => (
              <TableRow key={job.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="pl-6 py-6">
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Briefcase className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-base leading-tight mb-1" title={job.title}>
                          {job.title}
                        </h3>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="w-4 h-4" />
                            <span title={job.institution}>{job.institution}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span title={job.location}>{job.location}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center">
                      <User className="w-4 h-4 text-secondary-foreground" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {(job as Record<string, unknown>).user_profiles?.full_name || 'Unknown User'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(job as Record<string, unknown>).user_profiles?.email || 'No email'}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-6">
                  <div className="space-y-2">
                    <Badge variant="outline" className="font-medium">
                      {job.job_type}
                    </Badge>
                    <div className="flex flex-col gap-1">
                      {(() => {
                        const approvalStatus = (job as Record<string, unknown>).approval_status || 'draft';
                        if (approvalStatus === 'pending') {
                          return (
                            <Badge variant="outline" className="w-fit border-yellow-300 text-yellow-700 bg-yellow-50">
                              Pending Approval
                            </Badge>
                          );
                        } else if (approvalStatus === 'approved' && job.is_published) {
                          return (
                            <Badge variant="default" className="w-fit">
                              Published
                            </Badge>
                          );
                        } else if (approvalStatus === 'rejected') {
                          return (
                            <Badge variant="destructive" className="w-fit">
                              Rejected
                            </Badge>
                          );
                        } else {
                          return (
                            <Badge variant="secondary" className="w-fit">
                              Draft
                            </Badge>
                          );
                        }
                      })()}
                      
                      {/* Job Status Badge */}
                      {job.is_published && (() => {
                        const jobStatus = (job as Record<string, unknown>).job_status || 'active';
                        if (jobStatus === 'filled') {
                          return (
                            <Badge variant="outline" className="w-fit border-green-300 text-green-700 bg-green-50">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Filled
                            </Badge>
                          );
                        } else if (jobStatus === 'inactive') {
                          return (
                            <Badge variant="outline" className="w-fit border-gray-300 text-gray-700 bg-gray-50">
                              <Pause className="w-3 h-3 mr-1" />
                              Inactive
                            </Badge>
                          );
                        } else {
                          return (
                            <Badge variant="outline" className="w-fit border-blue-300 text-blue-700 bg-blue-50">
                              <Eye className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          );
                        }
                      })()}
                      
                      {job.is_featured && (
                        <Badge variant="destructive" className="w-fit">
                          <Star className="w-3 h-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(job.created_at)}</span>
                  </div>
                </TableCell>
                <TableCell className="pr-6 py-6">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedJob(job as Job)}
                      className="h-8 px-3"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          disabled={retractJob.isPending || toggleFeatured.isPending || deleteJob.isPending}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {/* For pending jobs: Only show Approve & Reject */}
                        {(job as Record<string, unknown>).approval_status === 'pending' && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleJobApproval(job.id, 'approve', job.title)}
                              className="cursor-pointer text-green-600 focus:text-green-600"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve & Publish
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleJobApproval(job.id, 'reject', job.title)}
                              className="cursor-pointer text-red-600 focus:text-red-600"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject Job
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        {/* For published/draft jobs: Show standard options */}
                        {(job as Record<string, unknown>).approval_status !== 'pending' && (
                          <>
                            {/* Send notification for approved jobs that haven't been notified */}
                            {(job as Record<string, unknown>).approval_status === 'approved' && job.is_published && !(job as Record<string, unknown>).notification_sent_at && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleSendNotification(job.id, job.title)}
                                  disabled={notificationSending === job.id}
                                  className="cursor-pointer"
                                >
                                  <Send className="w-4 h-4 mr-2" />
                                  {notificationSending === job.id ? 'Sending...' : 'Send Notification'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            
                            <DropdownMenuItem
                              onClick={() => handleRetractJob(job.id, job.is_published || false, job.posted_by)}
                              className="cursor-pointer"
                            >
                              {job.is_published ? (
                                <>
                                  <EyeOff className="w-4 h-4 mr-2" />
                                  Retract Job
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Publish Job
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleFeatured(job.id, job.is_featured || false)}
                              className="cursor-pointer"
                            >
                              {job.is_featured ? (
                                <>
                                  <StarOff className="w-4 h-4 mr-2" />
                                  Remove Featured
                                </>
                              ) : (
                                <>
                                  <Star className="w-4 h-4 mr-2" />
                                  Make Featured
                                </>
                              )}
                            </DropdownMenuItem>

                            {/* Job Status Controls for Published Jobs */}
                            {job.is_published && (job as Record<string, unknown>).approval_status === 'approved' && (
                              <>
                                <DropdownMenuSeparator />
                                {(() => {
                                  const jobStatus = (job as Record<string, unknown>).job_status || 'active';
                                  if (jobStatus === 'active') {
                                    return (
                                      <>
                                        <DropdownMenuItem
                                          onClick={() => handleUpdateJobStatus(job.id, 'filled', job.posted_by)}
                                          disabled={updateJobStatus.isPending}
                                          className="cursor-pointer text-green-600 focus:text-green-600"
                                        >
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                          Mark as Filled
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleUpdateJobStatus(job.id, 'inactive', job.posted_by)}
                                          disabled={updateJobStatus.isPending}
                                          className="cursor-pointer text-gray-600 focus:text-gray-600"
                                        >
                                          <Pause className="w-4 h-4 mr-2" />
                                          Set Inactive
                                        </DropdownMenuItem>
                                      </>
                                    );
                                  } else {
                                    return (
                                      <DropdownMenuItem
                                        onClick={() => handleUpdateJobStatus(job.id, 'active', job.posted_by)}
                                        disabled={updateJobStatus.isPending}
                                        className="cursor-pointer text-blue-600 focus:text-blue-600"
                                      >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Reactivate Job
                                      </DropdownMenuItem>
                                    );
                                  }
                                })()}
                              </>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteJob(job as Job)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Job
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    {selectedJob && (
      <JobDetailsModal
        job={selectedJob}
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    )}

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Job Post</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete the job post "{jobToDelete?.title}"? 
            This action cannot be undone and will remove the job from the system entirely.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDeleteJob}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Job
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Job Approval Confirmation Dialog */}
    <AlertDialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {approvalAction?.action === 'approve' ? 'Approve Job Post' : 'Reject Job Post'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to {approvalAction?.action} the job post "{approvalAction?.jobTitle}"? 
            {approvalAction?.action === 'approve' 
              ? ' This will publish the job to the job board and increment the user\'s approved job count.'
              : ' This will reject the job and it will not be published.'
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmJobApproval}
            className={approvalAction?.action === 'approve' 
              ? "bg-green-600 text-white hover:bg-green-700" 
              : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            }
          >
            {approvalAction?.action === 'approve' ? 'Approve Job' : 'Reject Job'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default JobManagementTable;
