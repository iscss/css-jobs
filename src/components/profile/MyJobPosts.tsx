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
import { Briefcase, Edit, Eye, EyeOff, Trash2 } from 'lucide-react';
import JobDetailsModal from '@/components/jobs/JobDetailsModal';
import EditJobModal from '@/components/jobs/EditJobModal';
import type { Tables } from '@/integrations/supabase/types';

type Job = Tables<'jobs'> & {
  job_tags: { id: string; tag: string; }[]
};

const MyJobPosts = () => {
  const { data: userJobs, isLoading } = useUserJobs();
  const retractJob = useRetractJob();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const handleRetractJob = (jobId: string, currentStatus: boolean) => {
    retractJob.mutate({
      jobId,
      isPublished: !currentStatus
    });
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
                        <Badge variant={job.is_published ? "default" : "secondary"}>
                          {job.is_published ? "Published" : "Draft"}
                        </Badge>
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
                        <Button
                          size="sm"
                          variant={job.is_published ? "destructive" : "outline"}
                          onClick={() => handleRetractJob(job.id, job.is_published || false)}
                          disabled={retractJob.isPending}
                        >
                          {job.is_published ? (
                            <>
                              <EyeOff className="w-4 h-4 mr-1" />
                              Retract
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-1" />
                              Publish
                            </>
                          )}
                        </Button>
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