
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CompactJobCard from "@/components/jobs/CompactJobCard";
import JobDetailsModal from "@/components/jobs/JobDetailsModal";
import JobFilters from "@/components/jobs/JobFilters";
import { useJobs } from "@/hooks/useJobs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter, Star, MapPin, Globe } from "lucide-react";
import type { Tables } from '@/integrations/supabase/types';

type Job = Tables<'jobs'> & {
  job_tags: { id: string; tag: string; }[]
};

const Jobs = () => {
  const { data: jobs, isLoading, error } = useJobs();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    types: [] as string[],
    remote: false,
    featured: false,
    region: "all",
    country: "all"
  });

  // Location mapping logic
  const getLocationMapping = () => {
    return {
      regions: {
        "north-america": ["united states", "usa", "us", "canada", "mexico"],
        "europe": ["united kingdom", "uk", "germany", "france", "netherlands", "switzerland", "sweden", "denmark", "norway", "finland", "italy", "spain", "austria", "belgium", "ireland", "portugal"],
        "asia": ["japan", "singapore", "south korea", "china", "india", "hong kong", "taiwan", "thailand", "malaysia"],
        "oceania": ["australia", "new zealand"],
        "south-america": ["brazil", "argentina", "chile", "colombia"],
        "africa": ["south africa", "egypt", "nigeria", "kenya"]
      },
      countries: {
        "us": ["united states", "usa", "us"],
        "ca": ["canada"],
        "uk": ["united kingdom", "uk", "england", "scotland", "wales"],
        "de": ["germany"],
        "fr": ["france"],
        "nl": ["netherlands"],
        "ch": ["switzerland"],
        "se": ["sweden"],
        "dk": ["denmark"],
        "no": ["norway"],
        "fi": ["finland"],
        "it": ["italy"],
        "es": ["spain"],
        "au": ["australia"],
        "nz": ["new zealand"],
        "jp": ["japan"],
        "sg": ["singapore"],
        "kr": ["south korea"],
        "cn": ["china"],
        "in": ["india"]
      }
    };
  };

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

    // Enhanced search functionality - search across all relevant fields
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
    }

    // Filter by job types
    if (filters.types && filters.types.length > 0) {
      filtered = filtered.filter(job => filters.types.includes(job.job_type));
    }

    // Filter by remote
    if (filters.remote) {
      filtered = filtered.filter(job => job.is_remote);
    }

    // Filter by featured
    if (filters.featured) {
      filtered = filtered.filter(job => job.is_featured);
    }

    // Filter by region
    if (filters.region && filters.region !== "all") {
      const locationMapping = getLocationMapping();
      const regionKeywords = locationMapping.regions[filters.region] || [];
      filtered = filtered.filter(job => {
        const location = job.location.toLowerCase();
        return regionKeywords.some(keyword => location.includes(keyword));
      });
    }

    // Filter by country
    if (filters.country && filters.country !== "all") {
      const locationMapping = getLocationMapping();
      const countryKeywords = locationMapping.countries[filters.country] || [];
      filtered = filtered.filter(job => {
        const location = job.location.toLowerCase();
        return countryKeywords.some(keyword => location.includes(keyword));
      });
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
      remote: false,
      featured: false,
      region: "all",
      country: "all"
    });
    setSearchParams({});
  };

  const getRegionLabel = (regionValue: string) => {
    const regions = {
      "north-america": "North America",
      "europe": "Europe",
      "asia": "Asia",
      "oceania": "Oceania",
      "south-america": "South America",
      "africa": "Africa"
    };
    return regions[regionValue] || regionValue;
  };

  const getCountryLabel = (countryValue: string) => {
    const countries = {
      "us": "United States", "ca": "Canada", "uk": "United Kingdom",
      "de": "Germany", "fr": "France", "nl": "Netherlands",
      "ch": "Switzerland", "se": "Sweden", "dk": "Denmark",
      "no": "Norway", "fi": "Finland", "it": "Italy", "es": "Spain",
      "au": "Australia", "nz": "New Zealand", "jp": "Japan",
      "sg": "Singapore", "kr": "South Korea", "cn": "China", "in": "India"
    };
    return countries[countryValue] || countryValue;
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

  const hasActiveFilters = filters.search || filters.types.length > 0 || filters.remote || filters.featured || (filters.region && filters.region !== "all") || (filters.country && filters.country !== "all");

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50">
        <Header />

        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar with filters */}
            <aside className="lg:w-80">
              <div className="sticky top-8">
                <JobFilters onFiltersChange={handleFiltersChange} currentFilters={filters} />
              </div>
            </aside>

            {/* Main content */}
            <main className="flex-1">
              {/* Enhanced header section */}
              <div className="mb-8">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
                    Browse All Positions
                  </h1>
                  <p className="text-gray-600 text-lg mb-4">
                    {isLoading ? (
                      "Loading opportunities..."
                    ) : (
                      `Discover ${filteredJobs.length} of ${jobs?.length || 0} research opportunities worldwide`
                    )}
                  </p>

                  {/* Search query display and active filters */}
                  {hasActiveFilters && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <div className="flex items-center gap-2 text-blue-700 font-medium">
                          <Filter className="w-4 h-4" />
                          <span>Active Filters:</span>
                        </div>

                        {filters.search && (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center gap-2 px-3 py-1">
                            <Search className="w-3 h-3" />
                            Search: "{filters.search}"
                            <button onClick={clearSearch} className="ml-1 hover:bg-blue-300 rounded-full p-0.5">
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        )}

                        {filters.featured && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 flex items-center gap-1 cursor-pointer hover:bg-yellow-200" onClick={() => setFilters(prev => ({ ...prev, featured: false }))}>
                            <Star className="w-3 h-3 fill-yellow-500" />
                            Featured
                            <X className="w-3 h-3 ml-1" />
                          </Badge>
                        )}

                        {filters.types.map(type => (
                          <Badge key={type} variant="secondary" className="bg-purple-100 text-purple-800 flex items-center gap-1 cursor-pointer hover:bg-purple-200" onClick={() => setFilters(prev => ({ ...prev, types: prev.types.filter(t => t !== type) }))}>
                            Type: {type}
                            <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}

                        {filters.region && filters.region !== "all" && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 flex items-center gap-1 cursor-pointer hover:bg-green-200" onClick={() => setFilters(prev => ({ ...prev, region: "all" }))}>
                            <Globe className="w-3 h-3" />
                            {getRegionLabel(filters.region)}
                            <X className="w-3 h-3 ml-1" />
                          </Badge>
                        )}

                        {filters.country && filters.country !== "all" && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex items-center gap-1 cursor-pointer hover:bg-blue-200" onClick={() => setFilters(prev => ({ ...prev, country: "all" }))}>
                            <MapPin className="w-3 h-3" />
                            {getCountryLabel(filters.country)}
                            <X className="w-3 h-3 ml-1" />
                          </Badge>
                        )}

                        {filters.remote && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800 flex items-center gap-1 cursor-pointer hover:bg-orange-200" onClick={() => setFilters(prev => ({ ...prev, remote: false }))}>
                            Remote Only
                            <X className="w-3 h-3 ml-1" />
                          </Badge>
                        )}
                      </div>

                      <Button
                        onClick={clearAllFilters}
                        variant="outline"
                        size="sm"
                        className="text-blue-700 border-blue-300 hover:bg-blue-100"
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
                    <div key={i} className="bg-white rounded-xl border p-6 shadow-sm">
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
                <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-100">
                  <div className="text-gray-400 text-7xl mb-6">🔍</div>
                  <h3 className="text-2xl font-bold text-gray-700 mb-3">No matching positions found</h3>
                  <p className="text-gray-600 text-lg mb-6">
                    {filters.search
                      ? `No results found for "${filters.search}". Try adjusting your search terms or filters.`
                      : "Try adjusting your search criteria or filters to discover more opportunities."
                    }
                  </p>
                  {hasActiveFilters && (
                    <Button onClick={clearAllFilters} className="bg-indigo-600 hover:bg-indigo-700">
                      Clear All Filters
                    </Button>
                  )}
                </div>
              )}

              {!isLoading && (!jobs || jobs.length === 0) && (
                <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-100">
                  <div className="text-gray-400 text-7xl mb-6">📋</div>
                  <h3 className="text-2xl font-bold text-gray-700 mb-3">No positions available</h3>
                  <p className="text-gray-600 text-lg">Check back soon for new research opportunities.</p>
                </div>
              )}
            </main>
          </div>
        </div>

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

export default Jobs;
