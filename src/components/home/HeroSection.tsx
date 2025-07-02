
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy-50 via-academic-50 to-white py-20">
      <div className="container mx-auto px-4 text-center">
        {/* Hero Content */}
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-navy-800 mb-6 leading-tight">
            Academic Opportunities in{" "}
            <span className="text-gradient">Computational Social Science</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Discover and post PhD positions, postdocs, faculty roles, and research collaborations 
            in the computational social science community.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input 
                placeholder="Search by keywords, institution, or research area..."
                className="pl-12 pr-4 py-4 text-lg border-2 border-gray-200 focus:border-navy-400 rounded-xl"
              />
              <Button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-navy-600 hover:bg-navy-700 px-6">
                Search
              </Button>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="bg-navy-600 hover:bg-navy-700 px-8 py-3 text-lg">
              Browse All Jobs
            </Button>
            <Button size="lg" variant="outline" className="border-navy-200 text-navy-700 hover:bg-navy-50 px-8 py-3 text-lg">
              Post a Position
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-md mx-auto mt-12 pt-8 border-t border-gray-200">
            <div>
              <div className="text-2xl font-bold text-navy-800">150+</div>
              <div className="text-sm text-gray-600">Active Jobs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-navy-800">50+</div>
              <div className="text-sm text-gray-600">Universities</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-navy-800">25+</div>
              <div className="text-sm text-gray-600">Countries</div>
            </div>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute -top-10 -right-10 w-64 h-64 bg-navy-100 rounded-full opacity-20"></div>
      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-academic-100 rounded-full opacity-30"></div>
    </section>
  );
};

export default HeroSection;
