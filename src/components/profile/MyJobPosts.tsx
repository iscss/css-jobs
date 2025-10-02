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
import { useUserJobs } from '@/hooks/useJobs';
import { useRetractJob, useWithdrawJob, useUpdateJobStatus, useDeleteJobUser } from '@/hooks/useJobManagement';
import { Briefcase, Edit, Eye, EyeOff, Trash2, Clock, Send, ArrowLeft, RefreshCw, CheckCircle, XCircle, Pause, MoreHorizontal } from 'lucide-react';
import JobDetailsModal from '@/components/jobs/JobDetailsModal';
import EditJobModal from '@/components/jobs/EditJobModal';
import DeleteJobModal from '@/components/profile/DeleteJobModal';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { Tables } from '@/integrations/supabase/types';

type Job = Tables<'jobs'> & {
  job_tags: { id: string; tag: string; }[]
};

const MyJobPosts = () => {
  const { data: userJobs, isLoading } = useUserJobs();
  const { data: userProfile } = useUserProfile();
  const retractJob = useRetractJob();
  const withdrawJob = useWithdrawJob();
  const updateJobStatus = useUpdateJobStatus();
  const deleteJob = useDeleteJobUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [deletingJob, setDeletingJob] = useState<Job | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRetractJob = (jobId: string, currentStatus: boolean) => {
    retractJob.mutate({
      jobId,
      isPublished: !currentStatus
    });
  };

  const handleWithdrawJob = (jobId: string) => {
    withdrawJob.mutate(jobId);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user-jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      ]);
      
      // Keep spinning for visual effect, then show success toast
      setTimeout(() => {
        setIsRefreshing(false);
        toast({
          title: "Data refreshed",
          description: "Your job posts and profile information have been updated.",
        });
      }, 800);
    } catch (error) {
      setIsRefreshing(false);
      toast({
        title: "Refresh failed",
        description: "There was an error refreshing your data.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateJobStatus = (jobId: string, status: 'active' | 'filled' | 'inactive') => {
    updateJobStatus.mutate({
      jobId,
      jobStatus: status
    });
  };

  const handleDeleteJob = (jobId: string) => {
    deleteJob.mutate(jobId);
  };

  const handlePublishOrSubmit = async (job: Job) => {
    const canPublishDirectly = userProfile?.can_publish_directly || userProfile?.is_admin;
    
    try {
      if (canPublishDirectly) {
        // Direct publish for experienced users
        const { error } = await supabase
          .from('jobs')
          .update({ 
            is_published: true,
            approval_status: 'approved',
            approved_at: new Date().toISOString(),
            job_status: 'active' // Set job status to active when publishing
          })
          .eq('id', job.id);
          
        if (error) throw error;
        
        toast({
          title: "Job Published",
          description: "Your job has been published successfully.",
        });
      } else {
        // Submit for approval for new users
        const { error } = await supabase
          .from('jobs')
          .update({ 
            approval_status: 'pending',
            submitted_for_approval_at: new Date().toISOString(),
            job_status: 'inactive' // Keep inactive while pending approval
          })
          .eq('id', job.id);
          
        if (error) throw error;
        
        toast({
          title: "Job Submitted",
          description: "Your job has been submitted for admin approval.",
        });
      }
      
      // Refresh the user jobs list using React Query
      queryClient.invalidateQueries({ queryKey: ['user-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (error) {
      console.error('Error updating job:', error);
      toast({
        title: "Error updating job",
        description: "There was an error updating the job. Please try again.",
        variant: "destructive",
      });
    }
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
          <CardTitle>My Job Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              My Job Posts ({userJobs?.length || 0})
            </CardTitle>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`
                relative overflow-hidden px-4 py-2
                bg-gradient-to-r from-blue-500 to-cyan-600
                hover:from-blue-600 hover:to-cyan-700
                text-white text-sm font-medium rounded-lg
                shadow-md hover:shadow-lg
                transform transition-all duration-300
                hover:scale-105 hover:-translate-y-0.5
                disabled:opacity-70 disabled:cursor-not-allowed
                disabled:transform-none
                ${isRefreshing ? 'animate-pulse shadow-blue-500/30' : ''}
              `}
            >
              <div className="flex items-center gap-2 relative z-10">
                <RefreshCw 
                  className={`
                    w-3.5 h-3.5 transition-all duration-500
                    ${isRefreshing ? 'animate-spin text-white drop-shadow-sm' : 'text-white/90'}
                  `} 
                />
                <span className="transition-all duration-300">
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </span>
              </div>
              
              {/* Cool animated effects for profile refresh */}
              {isRefreshing && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-cyan-500/20 animate-pulse" />
                  <div className="absolute -inset-0.5 bg-blue-500/10 rounded-lg blur animate-pulse" />
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!userJobs || userJobs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No job posts yet</h3>
              <p className="text-gray-600">Create your first job post to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Approval Status</TableHead>
                  <TableHead>Job Status</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{job.title}</div>
                        <div className="text-sm text-gray-500">{job.location}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{job.job_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {(() => {
                          const approvalStatus = (job as any).approval_status || 'draft';
                          if (approvalStatus === 'pending') {
                            return (
                              <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending Approval
                              </Badge>
                            );
                          } else if (approvalStatus === 'approved' && job.is_published) {
                            return <Badge variant="default">Published</Badge>;
                          } else if (approvalStatus === 'rejected') {
                            return <Badge variant="destructive">Rejected</Badge>;
                          } else {
                            return <Badge variant="secondary">Draft</Badge>;
                          }
                        })()}
                        {job.is_featured && (
                          <Badge variant="destructive">Featured</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const jobStatus = (job as any).job_status || 'active';
                        if (jobStatus === 'filled') {
                          return (
                            <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Filled
                            </Badge>
                          );
                        } else if (jobStatus === 'inactive') {
                          return (
                            <Badge variant="outline" className="border-gray-300 text-gray-700 bg-gray-50">
                              <Pause className="w-3 h-3 mr-1" />
                              Inactive
                            </Badge>
                          );
                        } else {
                          return (
                            <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
                              <Eye className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          );
                        }
                      })()}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatDate(job.created_at)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatDate(job.application_deadline)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedJob(job as Job)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {/* Edit Option - Always available */}
                            <DropdownMenuItem
                              onClick={() => setEditingJob(job as Job)}
                              className="cursor-pointer"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            
                            {(() => {
                              const approvalStatus = (job as any).approval_status || 'draft';
                              const jobStatus = (job as any).job_status || 'active';
                              const canPublishDirectly = userProfile?.can_publish_directly || userProfile?.is_admin;

                              if (job.is_published && approvalStatus === 'approved') {
                                // Published job - show job status controls
                                return (
                                  <>
                                    <DropdownMenuSeparator />
                                    {jobStatus === 'active' && (
                                      <>
                                        <DropdownMenuItem
                                          onClick={() => handleUpdateJobStatus(job.id, 'filled')}
                                          disabled={updateJobStatus.isPending}
                                          className="cursor-pointer text-green-600 focus:text-green-600"
                                        >
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                          Mark as Filled
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleUpdateJobStatus(job.id, 'inactive')}
                                          disabled={updateJobStatus.isPending}
                                          className="cursor-pointer text-gray-600 focus:text-gray-600"
                                        >
                                          <Pause className="w-4 h-4 mr-2" />
                                          Set Inactive
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {jobStatus !== 'active' && (
                                      <DropdownMenuItem
                                        onClick={() => handleUpdateJobStatus(job.id, 'active')}
                                        disabled={updateJobStatus.isPending}
                                        className="cursor-pointer text-blue-600 focus:text-blue-600"
                                      >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Reactivate
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleRetractJob(job.id, true)}
                                      disabled={retractJob.isPending}
                                      className="cursor-pointer text-red-600 focus:text-red-600"
                                    >
                                      <EyeOff className="w-4 h-4 mr-2" />
                                      Retract Job
                                    </DropdownMenuItem>
                                  </>
                                );
                              } else if (approvalStatus === 'pending') {
                                // Pending approval - show withdraw option
                                return (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleWithdrawJob(job.id)}
                                      disabled={withdrawJob.isPending}
                                      className="cursor-pointer text-orange-600 focus:text-orange-600"
                                    >
                                      <ArrowLeft className="w-4 h-4 mr-2" />
                                      {withdrawJob.isPending ? 'Withdrawing...' : 'Withdraw from Review'}
                                    </DropdownMenuItem>
                                  </>
                                );
                              } else if (approvalStatus === 'draft' || approvalStatus === 'rejected') {
                                // Draft or Rejected - show appropriate action based on user permissions
                                return (
                                  <>
                                    <DropdownMenuSeparator />
                                    {canPublishDirectly ? (
                                      <DropdownMenuItem
                                        onClick={() => handlePublishOrSubmit(job as Job)}
                                        disabled={retractJob.isPending}
                                        className="cursor-pointer text-blue-600 focus:text-blue-600"
                                      >
                                        <Eye className="w-4 h-4 mr-2" />
                                        {approvalStatus === 'rejected' ? 'Resubmit Job' : 'Publish Job'}
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={() => handlePublishOrSubmit(job as Job)}
                                        disabled={retractJob.isPending}
                                        className="cursor-pointer text-blue-600 focus:text-blue-600"
                                      >
                                        <Send className="w-4 h-4 mr-2" />
                                        {approvalStatus === 'rejected' ? 'Resubmit for Approval' : 'Submit for Approval'}
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                );
                              } else {
                                return null;
                              }
                            })()}
                            
                            {/* Delete option - Always available */}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeletingJob(job as Job)}
                              className="cursor-pointer text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}

      {editingJob && (
        <EditJobModal
          job={editingJob}
          isOpen={!!editingJob}
          onClose={() => setEditingJob(null)}
        />
      )}

      <DeleteJobModal
        job={deletingJob}
        isOpen={!!deletingJob}
        onClose={() => setDeletingJob(null)}
        onConfirm={handleDeleteJob}
        isDeleting={deleteJob.isPending}
      />
    </>
  );
};

export default MyJobPosts;