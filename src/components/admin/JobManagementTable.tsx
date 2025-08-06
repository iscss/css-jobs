
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
import { useAllJobs, useRetractJob, useToggleFeatured, useDeleteJob } from '@/hooks/useJobManagement';
import { Briefcase, Eye, EyeOff, Star, StarOff, Trash2, MoreHorizontal, User, Building2, Calendar, MapPin } from 'lucide-react';
import JobDetailsModal from '@/components/jobs/JobDetailsModal';
import type { Tables } from '@/integrations/supabase/types';

type Job = Tables<'jobs'> & {
  job_tags: { id: string; tag: string; }[]
};

const JobManagementTable = () => {
  const { data: allJobs, isLoading } = useAllJobs();
  const retractJob = useRetractJob();
  const toggleFeatured = useToggleFeatured();
  const deleteJob = useDeleteJob();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);

  const handleRetractJob = (jobId: string, currentStatus: boolean) => {
    retractJob.mutate({
      jobId,
      isPublished: !currentStatus
    });
  };

  const handleToggleFeatured = (jobId: string, currentStatus: boolean) => {
    toggleFeatured.mutate({
      jobId,
      isFeatured: !currentStatus
    });
  };

  const handleDeleteJob = (job: Job) => {
    setJobToDelete(job);
    setDeleteDialogOpen(true);
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
            {allJobs?.map((job) => (
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
                        {(job as any).user_profiles?.full_name || 'Unknown User'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(job as any).user_profiles?.email || 'No email'}
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
                      <Badge variant={job.is_published ? "default" : "secondary"} className="w-fit">
                        {job.is_published ? "Published" : "Draft"}
                      </Badge>
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
                        <DropdownMenuItem
                          onClick={() => handleRetractJob(job.id, job.is_published || false)}
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteJob(job as Job)}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Job
                        </DropdownMenuItem>
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
    </>
  );
};

export default JobManagementTable;
