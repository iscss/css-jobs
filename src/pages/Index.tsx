
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import ResearchAreasSection from "@/components/home/ResearchAreasSection";
import SignupPromptModal from "@/components/layout/SignupPromptModal";

import CompactJobCard from "@/components/jobs/CompactJobCard";
import JobDetailsModal from "@/components/jobs/JobDetailsModal";
import JobFilters from "@/components/jobs/JobFilters";
import { useJobs } from "@/hooks/useJobs";
import { useSignupPrompt } from "@/hooks/useSignupPrompt";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter, Briefcase } from "lucide-react";
import type { Tables } from '@/integrations/supabase/types';

type Job = Tables<'jobs'> & {
  job_tags: { id: string; tag: string; }[]
};

const Index = () => {
  const { data: jobs, isLoading, error } = useJobs();
  const { showPrompt, dismissPrompt } = useSignupPrompt();
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

  // Enhanced filter function with comprehensive search - only when there's a search term
  useEffect(() => {
    if (!jobs) return;

    // If there's a search term, apply full filtering
    if (filters.search) {
      let filtered = jobs;

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
          job.application_url || '',
          job.contact_email || '',
          job.duration || '',
          // Include remote status as searchable text
          job.is_remote ? 'remote' : '',
          // Include application deadline as searchable text
          job.application_deadline || '',
          ...job.job_tags.map(tag => tag.tag)
        ];

        return searchFields.some(field =>
          field.toLowerCase().includes(searchLower)
        );
      });

      // Filter by job types
      if (filters.types && filters.types.length > 0) {
        filtered = filtered.filter(job => filters.types.includes(job.job_type));
      }

      // Filter by topics
      if (filters.topics && filters.topics.length > 0) {
        filtered = filtered.filter(job =>
          job.job_tags?.some((tag: { tag: string }) => filters.topics.includes(tag.tag))
        );
      }

      // Filter by remote
      if (filters.remote) {
        filtered = filtered.filter(job => job.is_remote);
      }

      setFilteredJobs(filtered);
    } else {
      // No search term, show only featured jobs
      setFilteredJobs(jobs.filter(job => job.is_featured));
    }
  }, [jobs, filters]);

  return (
    <>
      <div className="page-wrapper">
        <Header />
        <main className="main-content">
          <HeroSection />

          {/* Job Posting Highlight Section */}
          <section className="py-12 bg-gradient-to-r from-indigo-50 to-purple-50 border-y border-indigo-100">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 text-indigo-600">
                      <Search className="w-5 h-5" />
                      <span className="font-semibold">Looking for a job?</span>
                    </div>
                    <p className="text-gray-700">
                      Discover positions from universities and research institutions worldwide.
                      Save opportunities, set up alerts, and never miss your perfect match.
                    </p>
                  </div>
                  <div className="space-y-4 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 text-purple-600">
                      <Briefcase className="w-5 h-5" />
                      <span className="font-semibold">Looking to hire?</span>
                    </div>
                    <p className="text-gray-700">
                      Reach the global CSS community with your opportunities.
                      Post positions and connect with top talent in computational social science.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {error && (
            <div className="container mx-auto px-4 py-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">Error loading jobs: {error.message}</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <section className="py-16 bg-white">
              <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-bold text-gradient-primary mb-4">Featured Jobs</h2>
                  <p className="text-xl text-gray-600">Discover opportunities at the forefront of computational social science</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="modern-card p-6">
                      <Skeleton className="h-6 w-32 mb-4" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3 mb-4" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : filteredJobs.length > 0 && (
            <section className="py-16 bg-white">
              <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-bold text-gradient-primary mb-4">
                    {filters.search ? `Search Results for "${filters.search}"` : 'Featured Jobs'}
                  </h2>
                  <p className="text-xl text-gray-600">
                    {filters.search
                      ? `Found ${filteredJobs.length} job${filteredJobs.length !== 1 ? 's' : ''} matching your search`
                      : 'Discover opportunities at the forefront of computational social science'
                    }
                  </p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredJobs.slice(0, 6).map((job) => (
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
        </main>
        <Footer />
      </div>

      {/* Job Details Modal */}
      <JobDetailsModal
        job={selectedJob}
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
      />

      {/* Signup Prompt Modal */}
      <SignupPromptModal
        isOpen={showPrompt}
        onClose={dismissPrompt}
      />
    </>
  );
};

export default Index;
