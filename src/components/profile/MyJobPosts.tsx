import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useUserJobs } from '@/hooks/useJobs';
import { useRetractJob } from '@/hooks/useJobManagement';
import { Briefcase, Edit, Eye, EyeOff, Trash2, Clock, Send } from 'lucide-react';
import JobDetailsModal from '@/components/jobs/JobDetailsModal';
import EditJobModal from '@/components/jobs/EditJobModal';
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const handleRetractJob = (jobId: string, currentStatus: boolean) => {
    retractJob.mutate({
      jobId,
      isPublished: !currentStatus
    });
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
            approved_at: new Date().toISOString()
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
            submitted_for_approval_at: new Date().toISOString()
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
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            My Job Posts ({userJobs?.length || 0})
          </CardTitle>
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
                  <TableHead>Status</TableHead>
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingJob(job as Job)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        {(() => {
                          const approvalStatus = (job as any).approval_status || 'draft';
                          const canPublishDirectly = userProfile?.can_publish_directly || userProfile?.is_admin;
                          
                          if (job.is_published) {
                            // Published job - show retract option
                            return (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRetractJob(job.id, true)}
                                disabled={retractJob.isPending}
                              >
                                <EyeOff className="w-4 h-4 mr-1" />
                                Retract
                              </Button>
                            );
                          } else if (approvalStatus === 'pending') {
                            // Pending approval - no action available
                            return (
                              <Button size="sm" variant="outline" disabled>
                                <Clock className="w-4 h-4 mr-1" />
                                Pending Review
                              </Button>
                            );
                          } else if (approvalStatus === 'rejected') {
                            // Rejected - allow editing only
                            return null;
                          } else {
                            // Draft - show appropriate action based on user permissions
                            if (canPublishDirectly) {
                              return (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePublishOrSubmit(job as Job)}
                                  disabled={retractJob.isPending}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Publish
                                </Button>
                              );
                            } else {
                              return (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePublishOrSubmit(job as Job)}
                                  disabled={retractJob.isPending}
                                >
                                  <Send className="w-4 h-4 mr-1" />
                                  Submit for Approval
                                </Button>
                              );
                            }
                          }
                        })()}
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
    </>
  );
};

export default MyJobPosts;