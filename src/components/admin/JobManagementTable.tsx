
import React from 'react';
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
import { useAllJobs, useRetractJob, useToggleFeatured } from '@/hooks/useJobManagement';
import { Briefcase, Eye, EyeOff, Star, StarOff } from 'lucide-react';

const JobManagementTable = () => {
  const { data: allJobs, isLoading } = useAllJobs();
  const retractJob = useRetractJob();
  const toggleFeatured = useToggleFeatured();

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          All Job Posts ({allJobs?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job Title</TableHead>
              <TableHead>Institution</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Posted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allJobs?.map((job) => (
              <TableRow key={job.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{job.title}</div>
                    <div className="text-sm text-gray-500">{job.location}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{job.institution}</span>
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
                  <div className="flex gap-2">
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
                    <Button
                      size="sm"
                      variant={job.is_featured ? "default" : "outline"}
                      onClick={() => handleToggleFeatured(job.id, job.is_featured || false)}
                      disabled={toggleFeatured.isPending}
                    >
                      {job.is_featured ? (
                        <>
                          <StarOff className="w-4 h-4 mr-1" />
                          Unfeature
                        </>
                      ) : (
                        <>
                          <Star className="w-4 h-4 mr-1" />
                          Feature
                        </>
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default JobManagementTable;
