
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Menu, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-navy-500 to-navy-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CSS</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-navy-800">CSS Jobs</h1>
              <p className="text-xs text-gray-600 hidden sm:block">Computational Social Science Opportunities</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#jobs" className="text-gray-700 hover:text-navy-600 transition-colors">Browse Jobs</a>
            <a href="#post" className="text-gray-700 hover:text-navy-600 transition-colors">Post a Job</a>
            <a href="#about" className="text-gray-700 hover:text-navy-600 transition-colors">About</a>
            <Button variant="outline" className="border-navy-200 text-navy-700 hover:bg-navy-50">
              Sign In
            </Button>
            <Button className="bg-navy-600 hover:bg-navy-700">
              Get Started
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && isMobile && (
          <nav className="md:hidden mt-4 pb-4 space-y-3 animate-fade-in">
            <a href="#jobs" className="block text-gray-700 hover:text-navy-600 transition-colors py-2">Browse Jobs</a>
            <a href="#post" className="block text-gray-700 hover:text-navy-600 transition-colors py-2">Post a Job</a>
            <a href="#about" className="block text-gray-700 hover:text-navy-600 transition-colors py-2">About</a>
            <div className="flex flex-col space-y-2 pt-2">
              <Button variant="outline" className="border-navy-200 text-navy-700 hover:bg-navy-50">
                Sign In
              </Button>
              <Button className="bg-navy-600 hover:bg-navy-700">
                Get Started
              </Button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
