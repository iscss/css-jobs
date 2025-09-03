import { useState } from "react";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark, Filter } from "lucide-react";
import CompactJobCard from "@/components/jobs/CompactJobCard";
import JobDetailsModal from "@/components/jobs/JobDetailsModal";

const SavedJobs = () => {
  const { data: savedJobs, isLoading: savedJobsLoading } = useSavedJobs();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);

  const getFilteredSavedJobs = () => {
    if (!savedJobs) return [];

    return savedJobs.filter((savedJob: any) => {
      if (!searchTerm) return true;

      const job = savedJob.jobs;
      const searchLower = searchTerm.toLowerCase();

      return (
        job?.title?.toLowerCase().includes(searchLower) ||
        job?.institution?.toLowerCase().includes(searchLower) ||
        job?.location?.toLowerCase().includes(searchLower) ||
        job?.description?.toLowerCase().includes(searchLower) ||
        job?.requirements?.toLowerCase().includes(searchLower)
      );
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bookmark className="w-5 h-5" />
            Saved Jobs ({getFilteredSavedJobs().length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search saved jobs by title, institution, location, or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {savedJobsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : getFilteredSavedJobs().length > 0 ? (
            <div className="space-y-4">
              {getFilteredSavedJobs().map((savedJob: any) => (
                <CompactJobCard
                  key={`saved-${savedJob.id}`}
                  job={savedJob.jobs}
                  onViewDetails={setSelectedJob}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {searchTerm ? "No matching saved jobs" : "No saved jobs yet"}
              </p>
              <p>
                {searchTerm
                  ? "Try adjusting your search terms or clear the search to see all saved jobs."
                  : "Start browsing jobs and save the ones you're interested in!"
                }
              </p>
              {!searchTerm && (
                <Button variant="outline" className="mt-4">
                  Browse Jobs
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <JobDetailsModal
        job={selectedJob}
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    </>
  );
};

export default SavedJobs;