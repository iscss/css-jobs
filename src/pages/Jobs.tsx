
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
        "south-america": ["brazil", "argentina", "chile", "colombia", "peru"],
        "africa": ["south africa", "egypt", "nigeria", "kenya", "ghana", "morocco", "tunisia", "ethiopia"]
      },
      countries: {
        "us": ["united states", "usa", "us"],
        "ca": ["canada"],
        "mx": ["mexico"],
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
        "at": ["austria"],
        "be": ["belgium"],
        "ie": ["ireland"],
        "pt": ["portugal"],
        "jp": ["japan"],
        "sg": ["singapore"],
        "kr": ["south korea"],
        "cn": ["china"],
        "in": ["india"],
        "hk": ["hong kong"],
        "tw": ["taiwan"],
        "th": ["thailand"],
        "my": ["malaysia"],
        "au": ["australia"],
        "nz": ["new zealand"],
        "br": ["brazil"],
        "ar": ["argentina"],
        "cl": ["chile"],
        "co": ["colombia"],
        "pe": ["peru"],
        "za": ["south africa"],
        "eg": ["egypt"],
        "ng": ["nigeria"],
        "ke": ["kenya"],
        "gh": ["ghana"],
        "ma": ["morocco"],
        "tn": ["tunisia"],
        "et": ["ethiopia"]
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
      <div className="page-wrapper">
        <Header />
        <main className="main-content container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Error loading jobs</h3>
            <p className="text-gray-600">Please try again later.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const hasActiveFilters = filters.search || filters.types.length > 0 || filters.remote || filters.featured || (filters.region && filters.region !== "all") || (filters.country && filters.country !== "all");

  return (
    <>
      <div className="page-wrapper">
        <Header />

        <main className="main-content">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Sidebar with filters */}
              <aside className="lg:w-80">
                <div className="sticky top-8">
                  <JobFilters onFiltersChange={handleFiltersChange} currentFilters={filters} />
                </div>
              </aside>

              {/* Main content */}
              <div className="flex-1">
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
                              "{filters.search}"
                              <button
                                onClick={clearSearch}
                                className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          )}

                          {filters.types.map((type) => (
                            <Badge key={type} className="bg-green-100 text-green-800 hover:bg-green-200 flex items-center gap-2 px-3 py-1">
                              {type}
                              <button
                                onClick={() => setFilters(prev => ({ ...prev, types: prev.types.filter(t => t !== type) }))}
                                className="ml-1 hover:bg-green-300 rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}

                          {filters.remote && (
                            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 flex items-center gap-2 px-3 py-1">
                              <Globe className="w-3 h-3" />
                              Remote
                              <button
                                onClick={() => setFilters(prev => ({ ...prev, remote: false }))}
                                className="ml-1 hover:bg-purple-300 rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          )}

                          {filters.featured && (
                            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 flex items-center gap-2 px-3 py-1">
                              <Star className="w-3 h-3" />
                              Featured
                              <button
                                onClick={() => setFilters(prev => ({ ...prev, featured: false }))}
                                className="ml-1 hover:bg-yellow-300 rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          )}

                          {filters.region && filters.region !== "all" && (
                            <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200 flex items-center gap-2 px-3 py-1">
                              <MapPin className="w-3 h-3" />
                              {getRegionLabel(filters.region)}
                              <button
                                onClick={() => setFilters(prev => ({ ...prev, region: "all" }))}
                                className="ml-1 hover:bg-indigo-300 rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          )}

                          {filters.country && filters.country !== "all" && (
                            <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200 flex items-center gap-2 px-3 py-1">
                              <Globe className="w-3 h-3" />
                              {getCountryLabel(filters.country)}
                              <button
                                onClick={() => setFilters(prev => ({ ...prev, country: "all" }))}
                                className="ml-1 hover:bg-orange-300 rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearAllFilters}
                          className="text-blue-700 border-blue-300 hover:bg-blue-100 hover:border-blue-400"
                        >
                          Clear all filters
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Jobs grid */}
                {isLoading ? (
                  <div className="grid gap-6 lg:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                          </div>
                          <div className="h-8 bg-gray-200 rounded w-16"></div>
                        </div>
                        <div className="h-20 bg-gray-200 rounded mb-4"></div>
                        <div className="flex justify-between items-center">
                          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                          <div className="h-8 bg-gray-200 rounded w-20"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredJobs.length > 0 ? (
                  <div className="grid gap-6 lg:grid-cols-2">
                    {filteredJobs.map((job) => (
                      <CompactJobCard
                        key={job.id}
                        job={job}
                        onViewDetails={setSelectedJob}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📭</div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No jobs found</h3>
                    <p className="text-gray-600 text-lg">Check back soon for new research opportunities.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

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
