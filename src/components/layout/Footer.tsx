
const Footer = () => {
  return (
    <footer className="bg-navy-800 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-navy-800 font-bold text-sm">CSS</span>
              </div>
              <div>
                <h3 className="text-lg font-bold">CSS Jobs</h3>
              </div>
            </div>
            <p className="text-navy-200 text-sm leading-relaxed">
              Connecting the computational social science community with meaningful academic opportunities worldwide.
            </p>
          </div>

          {/* Job Seekers */}
          <div>
            <h4 className="font-semibold mb-4">For Job Seekers</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-navy-200 hover:text-white transition-colors">Browse Jobs</a></li>
              <li><a href="#" className="text-navy-200 hover:text-white transition-colors">Search by Field</a></li>
              <li><a href="#" className="text-navy-200 hover:text-white transition-colors">Job Alerts</a></li>
              <li><a href="#" className="text-navy-200 hover:text-white transition-colors">Career Resources</a></li>
            </ul>
          </div>

          {/* Employers */}
          <div>
            <h4 className="font-semibold mb-4">For Employers</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-navy-200 hover:text-white transition-colors">Post a Job</a></li>
              <li><a href="#" className="text-navy-200 hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="text-navy-200 hover:text-white transition-colors">Recruitment Tips</a></li>
              <li><a href="#" className="text-navy-200 hover:text-white transition-colors">Analytics</a></li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="font-semibold mb-4">Community</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-navy-200 hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="text-navy-200 hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="text-navy-200 hover:text-white transition-colors">Research Network</a></li>
              <li><a href="#" className="text-navy-200 hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-navy-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-navy-200 mb-4 md:mb-0">
            © 2024 CSS Jobs. All rights reserved.
          </div>
          <div className="flex space-x-6 text-sm">
            <a href="#" className="text-navy-200 hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="text-navy-200 hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="text-navy-200 hover:text-white transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
