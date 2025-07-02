
import { Button } from "@/components/ui/button";
import { Search, Briefcase, Users, TrendingUp, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/jobs?search=${encodeURIComponent(searchTerm)}`);
  };

  return (
    <section className="relative bg-gradient-to-br from-slate-50 via-white to-indigo-50 pt-20 pb-32 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-purple-300 to-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-4 w-72 h-72 bg-gradient-to-r from-yellow-300 to-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-gradient-to-r from-pink-300 to-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="container mx-auto px-4 relative">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full text-sm font-medium mb-8 border border-indigo-200 shadow-sm">
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
          <p className="text-xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Discover exceptional opportunities in Computational Social Science, from PhD positions to faculty roles. 
            Join a global community of researchers pushing the boundaries of interdisciplinary science.
          </p>

          {/* Enhanced Search bar */}
          <form onSubmit={handleSearch} className="max-w-3xl mx-auto mb-12">
            <div className="relative bg-white rounded-2xl shadow-2xl p-2 border border-gray-100">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search positions, institutions, or keywords..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 text-lg border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent placeholder:text-gray-400"
                  />
                </div>
                <Button 
                  type="submit" 
                  size="lg" 
                  className="px-8 py-4 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
                >
                  <Search className="w-5 h-5 mr-2" />
                  Search Jobs
                </Button>
              </div>
            </div>
            
            {/* Search suggestions */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <span className="text-sm text-gray-500">Popular searches:</span>
              {['PhD', 'Postdoc', 'Machine Learning', 'Data Science', 'Remote'].map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setSearchTerm(term)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </form>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button 
              onClick={() => navigate('/jobs')}
              size="lg" 
              className="px-8 py-4 text-lg font-semibold bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black shadow-xl hover:shadow-2xl transition-all duration-200"
            >
              <Briefcase className="w-5 h-5 mr-2" />
              Browse All Jobs
            </Button>
            <Button 
              onClick={() => navigate('/post-job')}
              variant="outline" 
              size="lg" 
              className="px-8 py-4 text-lg font-semibold border-2 border-slate-800 text-slate-800 hover:bg-slate-800 hover:text-white shadow-xl hover:shadow-2xl transition-all duration-200"
            >
              <Users className="w-5 h-5 mr-2" />
              Post a Position
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 mb-2">500+</div>
              <div className="text-slate-600">Active Positions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 mb-2">200+</div>
              <div className="text-slate-600">Universities</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 mb-2">50+</div>
              <div className="text-slate-600">Countries</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 mb-2">1000+</div>
              <div className="text-slate-600">Researchers</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
