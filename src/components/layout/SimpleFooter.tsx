import { Sparkles } from "lucide-react";

const SimpleFooter = () => {
  return (
    <footer className="bg-background border-t border-border py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 modern-gradient rounded-xl flex items-center justify-center">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">CSS Jobs</h3>
              <p className="text-xs text-muted-foreground">Research Opportunities</p>
            </div>
          </div>

          {/* Simple navigation */}
          <div className="flex items-center space-x-8 text-sm">
            <a href="/jobs" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Browse Jobs
            </a>
            <a href="/post-job" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Post a Job
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              About
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Contact
            </a>
          </div>

          {/* Copyright */}
          <div className="text-muted-foreground text-sm text-center md:text-right">
            <p>© 2024 CSS Jobs</p>
            <p className="text-xs mt-1">All rights reserved</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SimpleFooter;