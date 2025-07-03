
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CompactJobCard from './CompactJobCard';
import JobDetailsModal from './JobDetailsModal';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Star, Zap } from 'lucide-react';
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
      <section className="py-20 bg-gradient-to-b from-white to-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mx-auto animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 rounded-xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!featuredJobs || featuredJobs.length === 0) {
    return (
      <section className="py-20 bg-gradient-to-b from-white to-slate-50">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-100 to-orange-100 text-orange-700 rounded-full text-sm font-medium mb-12 border border-orange-200 shadow-sm">
            <Star className="w-4 h-4 mr-2" />
            Featured Positions
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">No Featured Jobs Available</h2>
          <p className="text-xl text-gray-600 mb-10">Check back soon for new featured opportunities!</p>
          <Button onClick={() => navigate('/jobs')} size="lg" className="bg-indigo-600 hover:bg-indigo-700">
            Browse All Jobs
          </Button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="py-20 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.6),transparent)] -z-10"></div>
        
        <div className="container mx-auto px-4">
          {/* Enhanced Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-100 via-yellow-50 to-orange-100 text-amber-700 rounded-full text-sm font-medium mb-8 border border-amber-200 shadow-lg">
              <Star className="w-4 h-4 mr-2" />
              <span className="font-semibold">Handpicked Featured Positions</span>
              <Zap className="w-4 h-4 ml-2" />
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                Spotlight Opportunities
              </span>
            </h2>
            
            <p className="text-xl text-gray-600 max-w-4xl mx-auto mb-8 leading-relaxed">
              These exceptional positions have been carefully selected by our team for their outstanding research potential, 
              competitive packages, and prestigious institutions.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4">
              <Button 
                onClick={() => navigate('/jobs')}
                size="lg"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Browse All {/* Keep existing code for the rest of the button */} <ArrowRight className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Showing {featuredJobs.length} featured position{featuredJobs.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-lg max-w-2xl mx-auto">
              <p className="text-blue-800 font-medium flex items-center justify-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                These are our top recommended positions • 
                <button 
                  onClick={() => navigate('/jobs')}
                  className="text-blue-700 hover:text-blue-900 underline font-semibold transition-colors"
                >
                  View all opportunities →
                </button>
              </p>
            </div>
          </div>

          {/* Enhanced Featured Jobs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {featuredJobs.map((job, index) => (
              <div 
                key={job.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CompactJobCard
                  job={job}
                  onViewDetails={setSelectedJob}
                />
              </div>
            ))}
          </div>

          {/* Enhanced Call to Action */}
          <div className="text-center">
            <div className="bg-gradient-to-r from-slate-50 via-white to-indigo-50 rounded-3xl p-12 border border-indigo-100 shadow-xl max-w-4xl mx-auto">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              </div>
              
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                Ready to explore more opportunities?
              </h3>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Discover our complete database of research positions across all career levels, 
                from emerging PhD opportunities to senior faculty roles.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => navigate('/jobs')}
                  size="lg"
                  className="bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  View All Positions
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={() => navigate('/auth')}
                  variant="outline"
                  size="lg"
                  className="border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Post Your Position
                </Button>
              </div>
            </div>
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
