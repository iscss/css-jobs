import { Sparkles } from "lucide-react";

const SimpleFooter = () => {
  return (
    <footer className="bg-background border-t border-border py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 modern-gradient rounded-lg flex items-center justify-center">
              <Sparkles className="text-white w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">CSS Jobs</h3>
            </div>
          </div>

          {/* Simple navigation */}
          <div className="flex items-center space-x-6 text-sm">
            <a href="/jobs" className="text-muted-foreground hover:text-foreground transition-colors">
              Browse Jobs
            </a>
            <a href="/post-job" className="text-muted-foreground hover:text-foreground transition-colors">
              Post a Job
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              About
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a>
          </div>

          {/* Copyright */}
          <div className="text-muted-foreground text-sm">
            © 2024 CSS Jobs
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SimpleFooter;