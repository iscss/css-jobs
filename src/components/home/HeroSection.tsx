
import { Button } from "@/components/ui/button";
import { Search, Briefcase, Users, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import PostOpportunitiesModal from "@/components/layout/PostOpportunitiesModal";

const HeroSection = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showPostModal, setShowPostModal] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: userProfile } = useUserProfile();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/jobs?search=${encodeURIComponent(searchTerm)}`);
  };

  const handlePostOpportunities = () => {
    if (!user || !userProfile) {
      // Scenario 1: Not logged in or no profile - show modal
      setShowPostModal(true);
      return;
    }

    if (userProfile.user_type === 'job_seeker') {
      // Scenario 2: Job seeker - redirect to profile settings
      navigate('/profile?tab=profile');
      return;
    }

    if (userProfile.user_type === 'job_poster' && userProfile.is_approved_poster) {
      // Scenario 3: Approved job poster - go to post job page
      navigate('/post-job');
      return;
    }

    // Job poster but not approved - go to profile to see status
    navigate('/profile?tab=profile');
  };

  const popularSearches = [
    { term: 'PhD', color: 'bg-white/10 text-white hover:bg-white/20' },
    { term: 'Postdoc', color: 'bg-white/10 text-white hover:bg-white/20' },
    { term: 'Machine Learning', color: 'bg-white/10 text-white hover:bg-white/20' },
    { term: 'Data Science', color: 'bg-white/10 text-white hover:bg-white/20' },
    { term: 'Remote', color: 'bg-white/10 text-white hover:bg-white/20' }
  ];

  return (
    <section className="relative bg-brand-navy pt-16 pb-20 overflow-hidden">
      {/* Background decorative elements */}

      <div className="container mx-auto px-4 relative">
        <div className="text-center max-w-5xl mx-auto">

          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 leading-tight">
            Find Your Next
            <span className="block text-brand-gold">
              Research Position
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed">
            Discover exceptional opportunities in Computational Social Science, from PhD positions to faculty roles.
            <span className="font-semibold text-white"> Find your next position</span> or
            <span className="font-semibold text-white"> share job opportunities</span> with our global research community.
          </p>

          {/* Enhanced Search Section */}
          <div className="max-w-4xl mx-auto mb-16">
            <form onSubmit={handleSearch} className="mb-8">
              <div className="relative bg-white rounded-3xl shadow-2xl border border-gray-100 backdrop-blur-sm overflow-hidden">
                <div className="flex items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
                    <input
                      type="text"
                      placeholder="Search by position, institution, keywords, or location..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-16 pr-6 py-6 text-lg border-0 focus:outline-none focus:ring-0 bg-transparent placeholder:text-gray-400"
                    />
                  </div>
                  <div className="pr-3">
                    <Button
                      type="submit"
                      size="lg"
                      className="px-8 py-6 text-base font-semibold bg-brand-teal hover:bg-brand-teal-dark text-white rounded-2xl whitespace-nowrap"
                    >
                      <Search className="w-5 h-5 mr-2" />
                      Search
                    </Button>
                  </div>
                </div>
              </div>
            </form>

            {/* Popular searches */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-white/80">Popular searches:</p>
              <div className="flex flex-wrap justify-center gap-3">
                {popularSearches.map((search) => (
                  <button
                    key={search.term}
                    type="button"
                    onClick={() => setSearchTerm(search.term)}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${search.color} border border-transparent hover:scale-105 hover:shadow-md`}
                  >
                    {search.term}
                  </button>
                ))}
              </div>
            </div>

            {/* Enhanced hint section */}
            <div className="mt-8 p-4 bg-white/10 rounded-2xl border border-white/20">
              <p className="text-sm text-white/90 flex items-center justify-center gap-2 font-medium">
                <TrendingUp className="w-4 h-4" />
                <span>✨ Featured positions are highlighted below • Browse all positions for comprehensive results</span>
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={() => navigate('/jobs')}
              size="lg"
              className="px-8 py-4 text-base font-semibold bg-brand-teal hover:bg-brand-teal-dark text-white flex items-center gap-2"
            >
              <Briefcase className="w-5 h-5" />
              Browse Jobs
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              onClick={handlePostOpportunities}
              size="lg"
              className="px-8 py-4 text-base font-semibold bg-transparent border border-white/40 hover:bg-white/10 text-white flex items-center gap-2"
            >
              <Users className="w-5 h-5" />
              Post Jobs
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <PostOpportunitiesModal
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
      />
    </section>
  );
};

export default HeroSection;
