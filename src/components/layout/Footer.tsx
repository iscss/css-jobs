
import { Sparkles, Github, Twitter, Linkedin, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="text-white w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold">CSS Jobs</h3>
              </div>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Connecting the computational social science community with meaningful academic opportunities worldwide.
            </p>
            <div className="flex space-x-4 pt-4">
              <a href="#" className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Job Seekers */}
          <div>
            <h4 className="font-semibold mb-6 text-lg">For Job Seekers</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-slate-300 hover:text-white transition-colors hover:underline">Browse Jobs</a></li>
              <li><a href="#" className="text-slate-300 hover:text-white transition-colors hover:underline">Search by Field</a></li>
              <li><a href="#" className="text-slate-300 hover:text-white transition-colors hover:underline">Job Alerts</a></li>
              <li><a href="#" className="text-slate-300 hover:text-white transition-colors hover:underline">Career Resources</a></li>
            </ul>
          </div>

          {/* Employers */}
          <div>
            <h4 className="font-semibold mb-6 text-lg">For Employers</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-slate-300 hover:text-white transition-colors hover:underline">Post a Job</a></li>
              <li><a href="#" className="text-slate-300 hover:text-white transition-colors hover:underline">Pricing</a></li>
              <li><a href="#" className="text-slate-300 hover:text-white transition-colors hover:underline">Recruitment Tips</a></li>
              <li><a href="#" className="text-slate-300 hover:text-white transition-colors hover:underline">Analytics</a></li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="font-semibold mb-6 text-lg">Community</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-slate-300 hover:text-white transition-colors hover:underline">About Us</a></li>
              <li><a href="#" className="text-slate-300 hover:text-white transition-colors hover:underline">Blog</a></li>
              <li><a href="#" className="text-slate-300 hover:text-white transition-colors hover:underline">Research Network</a></li>
              <li><a href="#" className="text-slate-300 hover:text-white transition-colors hover:underline">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-700 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-slate-400 mb-4 md:mb-0">
            © 2024 CSS Jobs. All rights reserved.
          </div>
          <div className="flex space-x-8">
            <a href="#" className="text-slate-400 hover:text-white transition-colors hover:underline">Privacy Policy</a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors hover:underline">Terms of Service</a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors hover:underline">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
