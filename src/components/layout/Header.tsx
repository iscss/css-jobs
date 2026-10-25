
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Search, Briefcase, Plus, User, Shield, Info } from 'lucide-react';
import AuthButton from './AuthButton';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useAdminApprovals } from '@/hooks/useAdminApprovals';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import { Badge } from '@/components/ui/badge';
import PostOpportunitiesModal from './PostOpportunitiesModal';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPostJobModal, setShowPostJobModal] = useState(false);
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

  const handlePostJobClick = () => {
    if (canPostJobs) {
      handleNavigation('/post-job');
    } else {
      setShowPostJobModal(true);
    }
  };

  // Helper function to determine if a path is active
  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Helper function to get active styles
  const getActiveStyles = (path: string) => {
    const baseStyles = "flex items-center gap-2 h-8 px-2 text-xs font-medium rounded-none text-white/80 hover:text-white hover:bg-transparent";
    const activeStyles = "text-white border-b-2 border-brand-gold";
    return isActivePath(path) ? `${baseStyles} ${activeStyles}` : baseStyles;
  };

  // Helper function to get mobile active styles
  const getMobileActiveStyles = (path: string) => {
    const baseStyles = "flex items-center gap-2 justify-start text-xs font-medium rounded-none text-white/80 hover:text-white hover:bg-white/10";
    const activeStyles = "text-white border-l-2 border-brand-gold";
    return isActivePath(path) ? `${baseStyles} ${activeStyles}` : baseStyles;
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-brand-navy">
      <div className="h-[3px] bg-brand-gold" />
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-[49px]">
          {/* Logo */}
          <Link to="/jobs" className="flex items-center gap-3">
            <span className="font-bold tracking-widest text-white text-[15px]">ISCSS</span>
            <span className="hidden sm:block text-xs font-medium text-white/80">Jobs</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-7">

            <Button
              variant="ghost"
              onClick={handleSearch}
              className={getActiveStyles('/jobs')}
            >
              <Search className="w-4 h-4" />
              Browse Jobs
            </Button>

            <Button
              variant="ghost"
              className={getActiveStyles('/post-job')}
              onClick={handlePostJobClick}
            >
              <Plus className="w-4 h-4" />
              Post Job
            </Button>

            {user && (
              <>
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
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-white/20 py-4">
            <nav className="flex flex-col space-y-4">

              <Button
                variant="ghost"
                onClick={() => { handleSearch(); setIsMenuOpen(false); }}
                className={getMobileActiveStyles('/jobs')}
              >
                <Search className="w-4 h-4" />
                Browse Jobs
              </Button>

              <Button
                variant="ghost"
                className={`${getMobileActiveStyles('/post-job')} w-full`}
                onClick={() => { handlePostJobClick(); setIsMenuOpen(false); }}
              >
                <Plus className="w-4 h-4" />
                Post Job
              </Button>

              {user && (
                <>
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

              <div className="pt-4 border-t border-white/20">
                <AuthButton />
              </div>
            </nav>
          </div>
        )}
      </div>

      <PostOpportunitiesModal
        isOpen={showPostJobModal}
        onClose={() => setShowPostJobModal(false)}
      />
    </header>
  );
};

export default Header;
