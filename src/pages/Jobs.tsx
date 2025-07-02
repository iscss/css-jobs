
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import JobCard from "@/components/jobs/JobCard";
import JobFilters from "@/components/jobs/JobFilters";
import { useJobs } from "@/hooks/useJobs";
import { Skeleton } from "@/components/ui/skeleton";

const Jobs = () => {
  const { data: jobs, isLoading, error } = useJobs();
  const [searchParams] = useSearchParams();
  const [filteredJobs, setFilteredJobs] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    types: [] as string[],
    topics: [] as string[],
    remote: false
  });

  // Update filters when URL changes
  useEffect(() => {
    const searchTerm = searchParams.get("search");
    if (searchTerm) {
      setFilters(prev => ({ ...prev, search: searchTerm }));
    }
  }, [searchParams]);

  // Filter jobs when data or filters change
  useEffect(() => {
    if (!jobs) return;

    let filtered = jobs;

    // Filter by search term
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(job => 
        job.title.toLowerCase().includes(searchLower) ||
        job.institution.toLowerCase().includes(searchLower) ||
        job.description.toLowerCase().includes(searchLower) ||
        job.job_tags?.some((tag: any) => tag.tag.toLowerCase().includes(searchLower))
      );
    }

    // Filter by job types
    if (filters.types && filters.types.length > 0) {
      filtered = filtered.filter(job => filters.types.includes(job.job_type));
    }

    // Filter by topics
    if (filters.topics && filters.topics.length > 0) {
      filtered = filtered.filter(job => 
        job.job_tags?.some((tag: any) => filters.topics.includes(tag.tag))
      );
    }

    // Filter by remote
    if (filters.remote) {
      filtered = filtered.filter(job => job.is_remote);
    }

    setFilteredJobs(filtered);
  }, [jobs, filters]);

  const handleFiltersChange = (newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Error loading jobs</h3>
            <p className="text-gray-600">Please try again later.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar with filters */}
          <aside className="lg:w-80">
            <JobFilters onFiltersChange={handleFiltersChange} />
          </aside>

          {/* Main content */}
          <main className="flex-1">
            <div className="mb-6">
              <h1 className="text-3xl font-serif font-bold text-navy-800 mb-2">
                Browse Jobs
              </h1>
              <p className="text-gray-600">
                {isLoading ? (
                  "Loading jobs..."
                ) : (
                  `Showing ${filteredJobs.length} of ${jobs?.length || 0} opportunities`
                )}
              </p>
            </div>

            {isLoading ? (
              <div className="grid gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg border p-6">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3 mb-4" />
                    <div className="flex gap-2 mb-4">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-14" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}

            {!isLoading && filteredJobs.length === 0 && jobs && jobs.length > 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No jobs found</h3>
                <p className="text-gray-600">Try adjusting your filters to see more results.</p>
              </div>
            )}

            {!isLoading && (!jobs || jobs.length === 0) && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No jobs available</h3>
                <p className="text-gray-600">Check back later for new opportunities.</p>
              </div>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Jobs;
