
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CompactJobCard from "@/components/jobs/CompactJobCard";
import JobDetailsModal from "@/components/jobs/JobDetailsModal";
import JobFilters from "@/components/jobs/JobFilters";
import { useJobs } from "@/hooks/useJobs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from '@/integrations/supabase/types';

type Job = Tables<'jobs'> & {
  job_tags: { id: string; tag: string; }[]
};

const Jobs = () => {
  const { data: jobs, isLoading, error } = useJobs();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [sort, setSort] = useState<"newest" | "deadline">("newest");
  const [heroSearch, setHeroSearch] = useState(searchParams.get("search") || "");
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

  useEffect(() => {
    setHeroSearch(filters.search);
  }, [filters.search]);

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

    // The query already returns newest first, so only "deadline" re-orders.
    if (sort === "deadline") {
      filtered = [...filtered].sort((a, b) => {
        if (!a.application_deadline) return 1;
        if (!b.application_deadline) return -1;
        return a.application_deadline.localeCompare(b.application_deadline);
      });
    }

    setFilteredJobs(filtered);
  }, [jobs, filters, sort]);

  const handleFiltersChange = (newFilters: Partial<typeof filters>) => {
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

  const togglePill = (type: string) => {
    setFilters(prev => ({
      ...prev,
      types: prev.types.includes(type) ? prev.types.filter(t => t !== type) : [...prev.types, type],
    }));
  };

  const pillTypes = ["PhD", "Postdoc", "Faculty", "Research Assistant"];
  const pillBase = "rounded-full border border-brand-navy px-4 py-1 text-xs font-medium transition-colors";
  const pillOn = "bg-brand-navy text-white";
  const pillOff = "bg-transparent text-brand-navy hover:bg-brand-surface-2";

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
          {/* Hero band: headline, search and quick type filters */}
          <section className="bg-brand-surface border-b border-[#e8eaf0]">
            <div className="mx-auto max-w-[1440px] px-6 md:px-12 pt-9 pb-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#888] mb-2">Job board</p>
              <h1 className="text-3xl md:text-[34px] font-extrabold leading-tight text-brand-navy">
                Find your next role in <span className="text-brand-teal">computational social science</span>
              </h1>
              <form
                className="flex gap-2.5 mt-5 max-w-[760px]"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleFiltersChange({ search: heroSearch });
                }}
              >
                <input
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  placeholder="Search by title, institution or keyword…"
                  aria-label="Search jobs"
                  className="flex-1 min-w-0 bg-white border border-[#d9deea] rounded-md px-3.5 py-[11px] text-[13px] text-slate-800 placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
                />
                <button type="submit" className="px-[18px] py-[9px] rounded bg-brand-navy text-white text-[13px] font-semibold hover:bg-brand-navy/90 transition-colors">
                  Search
                </button>
              </form>
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  type="button"
                  className={`${pillBase} ${filters.types.length === 0 && !filters.remote ? pillOn : pillOff}`}
                  onClick={() => setFilters(prev => ({ ...prev, types: [], remote: false }))}
                >
                  All
                </button>
                {pillTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`${pillBase} ${filters.types.includes(type) ? pillOn : pillOff}`}
                    onClick={() => togglePill(type)}
                  >
                    {type}
                  </button>
                ))}
                <button
                  type="button"
                  className={`${pillBase} ${filters.remote ? pillOn : pillOff}`}
                  onClick={() => setFilters(prev => ({ ...prev, remote: !prev.remote }))}
                >
                  Remote
                </button>
              </div>
            </div>
          </section>

          <div className="mx-auto max-w-[1440px] px-6 md:px-12 pt-[30px] pb-10">
            <div className="flex flex-col lg:flex-row gap-[30px]">
              {/* Sidebar with filters */}
              <aside className="lg:w-[250px] lg:shrink-0">
                <div className="lg:sticky lg:top-24">
                  <JobFilters onFiltersChange={handleFiltersChange} currentFilters={filters} />
                </div>
              </aside>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs text-[#888] mb-3">
                  <span>
                    {isLoading
                      ? "Loading positions…"
                      : `${filteredJobs.length} position${filteredJobs.length === 1 ? "" : "s"}${hasActiveFilters ? ` of ${jobs?.length || 0}` : ""}`}
                    {hasActiveFilters && (
                      <button type="button" onClick={clearAllFilters} className="ml-3 text-brand-navy underline underline-offset-2 hover:no-underline">
                        Clear filters
                      </button>
                    )}
                  </span>
                  <label className="flex items-center gap-1.5">
                    Sort:
                    <Select value={sort} onValueChange={(v) => setSort(v as "newest" | "deadline")}>
                      <SelectTrigger className="h-7 w-auto gap-1 border-0 bg-transparent px-1 text-xs text-[#555] shadow-none focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="deadline">Deadline soonest</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                </div>

                {/* Jobs grid */}
                {isLoading ? (
                  <div className="grid gap-[18px] lg:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="bg-white rounded-md p-6 border border-[#e3e7ea] border-l-4 border-l-[#e3e7ea] animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-16 mb-3"></div>
                        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div className="h-8 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : filteredJobs.length > 0 ? (
                  <div className="grid gap-[18px] lg:grid-cols-2">
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
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No jobs found</h3>
                    <p className="text-sm text-gray-600">Try a different search, or check back soon for new opportunities.</p>
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
