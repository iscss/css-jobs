
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CompactJobCard from './CompactJobCard';
import JobDetailsModal from './JobDetailsModal';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';

type Job = Tables<'jobs'> & {
  job_tags: { id: string; tag: string; }[]
};

const FeaturedJobs = () => {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const navigate = useNavigate();

  const { data: featuredJobs, isLoading } = useQuery({
    queryKey: ['featured-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          job_tags (
            id,
            tag
          )
        `)
        .eq('is_published', true)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      return data as Job[];
    },
  });

  if (isLoading) {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mx-auto animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!featuredJobs || featuredJobs.length === 0) {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 rounded-full text-sm font-medium mb-8 border border-orange-200">
            <Sparkles className="w-4 h-4 mr-2" />
            Featured Positions
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">No Featured Jobs Available</h2>
          <p className="text-gray-600 mb-8">Check back soon for new featured opportunities!</p>
          <Button onClick={() => navigate('/jobs')} className="bg-indigo-600 hover:bg-indigo-700">
            Browse All Jobs
          </Button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 rounded-full text-sm font-medium mb-6 border border-orange-200">
              <Sparkles className="w-4 h-4 mr-2" />
              Featured Positions
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Highlighted Opportunities
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Discover hand-picked positions from leading institutions in computational social science
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                onClick={() => navigate('/jobs')}
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
              >
                Browse All Jobs <ArrowRight className="w-4 h-4" />
              </Button>
              <p className="text-sm text-gray-500">
                Showing {featuredJobs.length} featured position{featuredJobs.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Featured Jobs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredJobs.map((job) => (
              <CompactJobCard
                key={job.id}
                job={job}
                onViewDetails={setSelectedJob}
              />
            ))}
          </div>

          {/* Call to Action */}
          <div className="text-center mt-12 p-8 bg-gradient-to-r from-slate-50 to-indigo-50 rounded-2xl border border-indigo-100">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Looking for more opportunities?
            </h3>
            <p className="text-gray-600 mb-6">
              Explore our full database of research positions and find your perfect match
            </p>
            <Button 
              onClick={() => navigate('/jobs')}
              variant="outline"
              size="lg"
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
            >
              View All Positions
            </Button>
          </div>
        </div>
      </section>

      {/* Job Details Modal */}
      <JobDetailsModal
        job={selectedJob}
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    </>
  );
};

export default FeaturedJobs;
