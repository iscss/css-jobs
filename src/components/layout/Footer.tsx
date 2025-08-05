
import { Sparkles } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-slate-50 to-slate-100 border-t border-slate-200 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Sparkles className="text-white w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">CSS Jobs</h3>
              <p className="text-sm text-slate-600">Computational Social Science Careers</p>
            </div>
          </div>

          {/* Essential Links */}
          <div className="flex items-center space-x-8">
            <a href="#" className="text-slate-600 hover:text-slate-800 transition-colors text-sm font-medium">
              About
            </a>
            <a href="#" className="text-slate-600 hover:text-slate-800 transition-colors text-sm font-medium">
              Contact
            </a>
            <a href="#" className="text-slate-600 hover:text-slate-800 transition-colors text-sm font-medium">
              Privacy
            </a>
          </div>

          {/* Copyright */}
          <div className="text-slate-500 text-sm">
            © 2025 CSS Jobs
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
