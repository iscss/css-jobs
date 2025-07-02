
import JobCard from "./JobCard";
import { useJobs } from "@/hooks/useJobs";
import { Skeleton } from "@/components/ui/skeleton";

const FeaturedJobs = () => {
  const { data: jobs, isLoading } = useJobs();
  
  // Filter for featured jobs, limit to 3
  const featuredJobs = jobs?.filter(job => job.is_featured).slice(0, 3) || [];

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif font-bold text-navy-800 mb-4">Featured Opportunities</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover exceptional research positions and academic opportunities from leading institutions worldwide.
          </p>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border p-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <div className="flex gap-2 mb-4">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : featuredJobs.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">⭐</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No featured jobs yet</h3>
            <p className="text-gray-600">Check back soon for featured opportunities.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedJobs;
