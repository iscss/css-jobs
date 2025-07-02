
import { Button } from "@/components/ui/button";
import { Search, Sparkles, TrendingUp, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const HeroSection = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = () => {
    if (searchTerm.trim()) {
      navigate(`/jobs?search=${encodeURIComponent(searchTerm)}`);
    } else {
      navigate("/jobs");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50 py-24">
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 rounded-full blur-xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-gradient-to-r from-pink-400/20 to-yellow-400/20 rounded-full blur-xl animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full blur-lg animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="container mx-auto px-4 text-center relative">
        {/* Hero Content */}
        <div className="max-w-5xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-indigo-200">
            <Sparkles className="w-4 h-4" />
            Academic Opportunities Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-slate-800 mb-8 leading-tight">
            Find Your Next{" "}
            <span className="text-gradient-primary">Academic</span>{" "}
            Opportunity
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
            Discover PhD positions, postdocs, faculty roles, and research collaborations 
            in computational social science from top institutions worldwide.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
              <Input 
                placeholder="Search by keywords, institution, or research area..."
                className="pl-14 pr-4 py-6 text-lg border-2 border-slate-200 focus:border-indigo-400 rounded-2xl shadow-lg focus:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button 
                onClick={handleSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 px-8 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
              >
                Search
              </Button>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Button 
              size="lg" 
              onClick={() => navigate("/jobs")}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 px-10 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <TrendingUp className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              Browse All Jobs
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate("/auth")}
              className="border-2 border-slate-300 text-slate-700 hover:bg-slate-50 px-10 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <Users className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              Post a Position
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-slate-800 mb-1">500+</div>
              <div className="text-sm text-slate-500 font-medium">Active Jobs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-slate-800 mb-1">150+</div>
              <div className="text-sm text-slate-500 font-medium">Universities</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-slate-800 mb-1">50+</div>
              <div className="text-sm text-slate-500 font-medium">Countries</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
