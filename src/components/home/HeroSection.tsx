
import { Button } from "@/components/ui/button";
import { Search, Briefcase, Users, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/jobs?search=${encodeURIComponent(searchTerm)}`);
  };

  const popularSearches = [
    { term: 'PhD', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    { term: 'Postdoc', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
    { term: 'Machine Learning', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
    { term: 'Data Science', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
    { term: 'Remote', color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' }
  ];

  return (
    <section className="relative bg-gradient-to-br from-slate-50 via-white to-indigo-50 pt-20 pb-32 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-purple-300 to-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-4 w-72 h-72 bg-gradient-to-r from-yellow-300 to-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-gradient-to-r from-pink-300 to-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="container mx-auto px-4 relative">
        <div className="text-center max-w-5xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full text-sm font-medium mb-8 border border-indigo-200 shadow-sm">
            <Sparkles className="w-4 h-4 mr-2" />
            Connecting Research Communities Worldwide
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-slate-900 mb-6 leading-tight">
            Find Your Next
            <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Research Position
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-4xl mx-auto leading-relaxed">
            Discover exceptional opportunities in Computational Social Science, from PhD positions to faculty roles. 
            Join a global community of researchers pushing the boundaries of interdisciplinary science.
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
                      className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl whitespace-nowrap"
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
              <p className="text-sm font-medium text-gray-600">Popular searches:</p>
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
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 shadow-lg">
              <p className="text-sm text-blue-800 flex items-center justify-center gap-2 font-medium">
                <TrendingUp className="w-4 h-4" />
                <span>✨ Featured positions are highlighted below • Browse all positions for comprehensive results</span>
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button 
              onClick={() => navigate('/jobs')}
              size="lg" 
              className="px-8 py-4 text-lg font-semibold bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center gap-2"
            >
              <Briefcase className="w-5 h-5" />
              Browse All Positions
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button 
              onClick={() => navigate('/auth')}
              variant="outline" 
              size="lg" 
              className="px-8 py-4 text-lg font-semibold border-2 border-slate-800 text-slate-800 hover:bg-slate-800 hover:text-white shadow-xl hover:shadow-2xl transition-all duration-200"
            >
              <Users className="w-5 h-5 mr-2" />
              Post a Position
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">500+</div>
              <div className="text-slate-600">Active Positions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">200+</div>
              <div className="text-slate-600">Universities</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">50+</div>
              <div className="text-slate-600">Countries</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">1000+</div>
              <div className="text-slate-600">Researchers</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
