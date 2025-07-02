
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Menu, X, Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="text-white w-5 h-5" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">CSS Jobs</h1>
              <p className="text-xs text-slate-500 hidden sm:block">Computational Social Science</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#jobs" className="text-slate-600 hover:text-indigo-600 transition-colors font-medium">Browse Jobs</a>
            <a href="#post" className="text-slate-600 hover:text-indigo-600 transition-colors font-medium">Post a Job</a>
            <a href="#about" className="text-slate-600 hover:text-indigo-600 transition-colors font-medium">About</a>
            <Button variant="ghost" className="text-slate-600 hover:text-indigo-600 hover:bg-indigo-50">
              Sign In
            </Button>
            <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
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
          <nav className="md:hidden mt-6 pb-6 space-y-4 animate-fade-in">
            <a href="#jobs" className="block text-slate-600 hover:text-indigo-600 transition-colors py-2 font-medium">Browse Jobs</a>
            <a href="#post" className="block text-slate-600 hover:text-indigo-600 transition-colors py-2 font-medium">Post a Job</a>
            <a href="#about" className="block text-slate-600 hover:text-indigo-600 transition-colors py-2 font-medium">About</a>
            <div className="flex flex-col space-y-3 pt-4 border-t border-gray-100">
              <Button variant="ghost" className="justify-start text-slate-600 hover:text-indigo-600 hover:bg-indigo-50">
                Sign In
              </Button>
              <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg">
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
