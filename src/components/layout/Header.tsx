
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Search, Briefcase, Plus, User, Shield, Home, Info } from 'lucide-react';
import AuthButton from './AuthButton';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useAdminApprovals } from '@/hooks/useAdminApprovals';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import { Badge } from '@/components/ui/badge';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: isAdmin } = useAdminCheck();
  const { data: pendingApprovals } = useAdminApprovals();
  const { data: userProfile } = useUserProfile();
  const { refreshPageData } = usePageRefresh();

  const handleSearch = () => {
    refreshPageData('/jobs');
    navigate('/jobs');
  };

  const handleNavigation = (path: string) => {
    refreshPageData(path);
    navigate(path);
  };

  const pendingCount = pendingApprovals?.length || 0;

  // Check if user can post jobs (not a job-seeker)
  const canPostJobs = user && userProfile?.user_type !== 'job_seeker';

  // Helper function to determine if a path is active
  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Helper function to get active styles
  const getActiveStyles = (path: string) => {
    const baseStyles = "flex items-center gap-2 text-gray-600 hover:text-gray-900";
    const activeStyles = "text-indigo-600 bg-indigo-50 hover:text-indigo-700 hover:bg-indigo-100";
    return isActivePath(path) ? `${baseStyles} ${activeStyles}` : baseStyles;
  };

  // Helper function to get mobile active styles
  const getMobileActiveStyles = (path: string) => {
    const baseStyles = "flex items-center gap-2 justify-start text-gray-600 hover:text-gray-900";
    const activeStyles = "text-indigo-600 bg-indigo-50 hover:text-indigo-700 hover:bg-indigo-100";
    return isActivePath(path) ? `${baseStyles} ${activeStyles}` : baseStyles;
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CSS</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                CSS Jobs
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Button 
              variant="ghost" 
              className={getActiveStyles('/')}
              onClick={() => handleNavigation('/')}
            >
              <Home className="w-4 h-4" />
              Home
            </Button>

            <Button
              variant="ghost"
              onClick={handleSearch}
              className={getActiveStyles('/jobs')}
            >
              <Search className="w-4 h-4" />
              Browse Jobs
            </Button>

            {user && (
              <>
                {canPostJobs && (
                  <Button 
                    variant="ghost" 
                    className={getActiveStyles('/post-job')}
                    onClick={() => handleNavigation('/post-job')}
                  >
                    <Plus className="w-4 h-4" />
                    Post Job
                  </Button>
                )}

                <Button 
                  variant="ghost" 
                  className={getActiveStyles('/profile')}
                  onClick={() => handleNavigation('/profile')}
                >
                  <User className="w-4 h-4" />
                  Profile
                </Button>

                {isAdmin && (
                  <Button 
                    variant="ghost" 
                    className={`${getActiveStyles('/admin')} relative`}
                    onClick={() => handleNavigation('/admin')}
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                    {pendingCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                      >
                        {pendingCount}
                      </Badge>
                    )}
                  </Button>
                )}
              </>
            )}

            <Link to="/about">
              <Button variant="ghost" className={getActiveStyles('/about')}>
                <Info className="w-4 h-4" />
                About
              </Button>
            </Link>
          </nav>

          {/* Auth Button */}
          <div className="hidden md:block">
            <AuthButton />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <nav className="flex flex-col space-y-4">
              <Button 
                variant="ghost" 
                className={`${getMobileActiveStyles('/')} w-full`}
                onClick={() => { handleNavigation('/'); setIsMenuOpen(false); }}
              >
                <Home className="w-4 h-4" />
                Home
              </Button>

              <Button
                variant="ghost"
                onClick={() => { handleSearch(); setIsMenuOpen(false); }}
                className={getMobileActiveStyles('/jobs')}
              >
                <Search className="w-4 h-4" />
                Browse Jobs
              </Button>

              {user && (
                <>
                  {canPostJobs && (
                    <Button 
                      variant="ghost" 
                      className={`${getMobileActiveStyles('/post-job')} w-full`}
                      onClick={() => { handleNavigation('/post-job'); setIsMenuOpen(false); }}
                    >
                      <Plus className="w-4 h-4" />
                      Post Job
                    </Button>
                  )}

                  <Button 
                    variant="ghost" 
                    className={`${getMobileActiveStyles('/profile')} w-full`}
                    onClick={() => { handleNavigation('/profile'); setIsMenuOpen(false); }}
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </Button>

                  {isAdmin && (
                    <Button 
                      variant="ghost" 
                      className={`${getMobileActiveStyles('/admin')} w-full relative`}
                      onClick={() => { handleNavigation('/admin'); setIsMenuOpen(false); }}
                    >
                      <Shield className="w-4 h-4" />
                      Admin
                      {pendingCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                        >
                          {pendingCount}
                        </Badge>
                      )}
                    </Button>
                  )}
                </>
              )}

              <Link to="/about">
                <Button variant="ghost" className={`${getMobileActiveStyles('/about')} w-full`}>
                  <Info className="w-4 h-4" />
                  About
                </Button>
              </Link>

              <div className="pt-4 border-t border-gray-200">
                <AuthButton />
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
