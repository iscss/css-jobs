
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import StatsSection from "@/components/home/StatsSection";
import ResearchAreasSection from "@/components/home/ResearchAreasSection";
import CompactJobCard from "@/components/jobs/CompactJobCard";
import JobDetailsModal from "@/components/jobs/JobDetailsModal";
import JobFilters from "@/components/jobs/JobFilters";
import { useJobs } from "@/hooks/useJobs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter } from "lucide-react";
import type { Tables } from '@/integrations/supabase/types';

type Job = Tables<'jobs'> & {
  job_tags: { id: string; tag: string; }[]
};

const Index = () => {
  const { data: jobs, isLoading, error } = useJobs();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
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

  // Enhanced filter function with comprehensive search
  useEffect(() => {
    if (!jobs) return;

    let filtered = jobs;

    // Enhanced search functionality
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(job => {
        const searchFields = [
          job.title,
          job.institution,
          job.department || '',
          job.location,
          job.description,
          job.requirements || '',
          job.pi_name || '',
          job.job_type,
          job.funding_source || '',
          ...job.job_tags.map(tag => tag.tag)
        ];
        
        return searchFields.some(field => 
          field.toLowerCase().includes(searchLower)
        );
      });
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

  const clearSearch = () => {
    setFilters(prev => ({ ...prev, search: "" }));
    setSearchParams(prev => {
      prev.delete("search");
      return prev;
    });
  };

  const clearAllFilters = () => {
    setFilters({
      search: "",
      types: [],
      topics: [],
      remote: false
    });
    setSearchParams({});
  };

  const hasActiveFilters = filters.search || filters.types.length > 0 || filters.topics.length > 0 || filters.remote;
  const featuredJobs = jobs?.filter(job => job.is_featured) || [];

  return (
    <>
      <div className="min-h-screen">
        <Header />
        <HeroSection />
        
        {/* Featured Jobs Section */}
        {featuredJobs.length > 0 && (
          <section className="py-16 bg-gradient-to-br from-primary/5 to-secondary/5">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">Featured Opportunities</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Discover handpicked research positions from leading institutions worldwide
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
                {featuredJobs.slice(0, 6).map((job) => (
                  <CompactJobCard
                    key={job.id}
                    job={job}
                    onViewDetails={setSelectedJob}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        <ResearchAreasSection />
        <StatsSection />

        {/* All Jobs Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Sidebar with filters */}
              <aside className="lg:w-80">
                <div className="sticky top-8">
                  <JobFilters onFiltersChange={handleFiltersChange} />
                </div>
              </aside>

              {/* Main content */}
              <main className="flex-1">
                {/* Header section */}
                <div className="mb-8">
                  <div className="bg-card rounded-xl p-6 shadow-sm border">
                    <h2 className="text-3xl font-bold text-foreground mb-3">
                      Browse All Positions
                    </h2>
                    <p className="text-muted-foreground text-lg mb-4">
                      {isLoading ? (
                        "Loading opportunities..."
                      ) : (
                        `Discover ${filteredJobs.length} of ${jobs?.length || 0} research opportunities worldwide`
                      )}
                    </p>

                    {/* Active filters */}
                    {hasActiveFilters && (
                      <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <div className="flex items-center gap-2 text-foreground font-medium">
                            <Filter className="w-4 h-4" />
                            <span>Active Filters:</span>
                          </div>
                          
                          {filters.search && (
                            <Badge className="flex items-center gap-2">
                              <Search className="w-3 h-3" />
                              Search: "{filters.search}"
                              <button onClick={clearSearch} className="ml-1 hover:bg-primary/20 rounded-full p-0.5">
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          )}
                          
                          {filters.types.map(type => (
                            <Badge key={type} variant="secondary">
                              Type: {type}
                            </Badge>
                          ))}
                          
                          {filters.topics.map(topic => (
                            <Badge key={topic} variant="secondary">
                              Topic: {topic}
                            </Badge>
                          ))}
                          
                          {filters.remote && (
                            <Badge variant="secondary">
                              Remote Only
                            </Badge>
                          )}
                        </div>
                        
                        <Button 
                          onClick={clearAllFilters}
                          variant="outline"
                          size="sm"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Clear All Filters
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {isLoading ? (
                  <div className="grid gap-6">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-card rounded-xl border p-6 shadow-sm">
                        <div className="flex gap-3 mb-4">
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-6 w-16" />
                        </div>
                        <Skeleton className="h-7 w-3/4 mb-3" />
                        <Skeleton className="h-4 w-1/2 mb-2" />
                        <Skeleton className="h-4 w-2/3 mb-4" />
                        <div className="flex gap-2 mb-4">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-6 w-14" />
                        </div>
                        <Skeleton className="h-16 w-full mb-4" />
                        <div className="flex justify-between items-center">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-9 w-28" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {filteredJobs.map((job) => (
                      <CompactJobCard
                        key={job.id}
                        job={job}
                        onViewDetails={setSelectedJob}
                      />
                    ))}
                  </div>
                )}

                {!isLoading && filteredJobs.length === 0 && jobs && jobs.length > 0 && (
                  <div className="text-center py-16 bg-card rounded-xl shadow-sm border">
                    <div className="text-muted-foreground text-6xl mb-6">🔍</div>
                    <h3 className="text-2xl font-bold text-foreground mb-3">No matching positions found</h3>
                    <p className="text-muted-foreground text-lg mb-6">
                      {filters.search 
                        ? `No results found for "${filters.search}". Try adjusting your search terms or filters.`
                        : "Try adjusting your search criteria or filters to discover more opportunities."
                      }
                    </p>
                    {hasActiveFilters && (
                      <Button onClick={clearAllFilters}>
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                )}

                {!isLoading && (!jobs || jobs.length === 0) && (
                  <div className="text-center py-16 bg-card rounded-xl shadow-sm border">
                    <div className="text-muted-foreground text-6xl mb-6">📋</div>
                    <h3 className="text-2xl font-bold text-foreground mb-3">No positions available</h3>
                    <p className="text-muted-foreground text-lg">Check back soon for new research opportunities.</p>
                  </div>
                )}
              </main>
            </div>
          </div>
        </section>

        <Footer />
      </div>

      {/* Job Details Modal */}
      <JobDetailsModal
        job={selectedJob}
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    </>
  );
};

export default Index;
