
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Plus } from 'lucide-react';
import AuthButton from './AuthButton';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import PostOpportunitiesModal from './PostOpportunitiesModal';

// The jobs list is the whole site, so there is no centre navigation: the logo
// goes home, and everything else sits in one group at the top right. The
// buttons here are plain <button>s because the shared Button's default variant
// paints a gradient image over any background colour.
const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: userProfile } = useUserProfile();
  const { refreshPageData } = usePageRefresh();

  // Check if user can post jobs (not a job-seeker)
  const canPostJobs = user && userProfile?.user_type !== 'job_seeker';

  const handlePostJobClick = () => {
    if (canPostJobs) {
      refreshPageData('/post-job');
      navigate('/post-job');
    } else {
      setShowPostJobModal(true);
    }
  };

  const postButton =
    'flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-md bg-brand-gold text-brand-navy hover:bg-brand-gold/90 transition-colors';

  return (
    <header className="sticky top-0 z-50 w-full bg-brand-navy">
      <div className="h-[3px] bg-brand-gold" />
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-[49px]">
          {/* Logo: the way home */}
          <Link to="/" className="flex items-center gap-3">
            <span className="font-bold tracking-widest text-white text-[15px]">ISCSS</span>
            <span className="hidden sm:block text-xs font-medium text-white/80">Jobs</span>
          </Link>

          {/* Desktop: everything on the right */}
          <div className="hidden md:flex items-center gap-3">
            <button type="button" className={postButton} onClick={handlePostJobClick}>
              <Plus className="w-4 h-4" />
              Post a job
            </button>
            <AuthButton />
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden p-2 text-white hover:bg-white/10 rounded-md"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-white/20 py-4 space-y-4">
            <button
              type="button"
              className={`${postButton} w-full justify-start`}
              onClick={() => { handlePostJobClick(); setIsMenuOpen(false); }}
            >
              <Plus className="w-4 h-4" />
              Post a job
            </button>
            <AuthButton inline onNavigate={() => setIsMenuOpen(false)} />
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
