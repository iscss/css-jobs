
import { canOpenPostPage } from '@/lib/roles';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Plus } from 'lucide-react';
import AuthButton from './AuthButton';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import PostOpportunitiesModal from './PostOpportunitiesModal';

// Light header: gold strip on top, white bar, navy wordmark with a teal "Jobs"
// tag. The jobs list is the whole site, so there is no centre navigation: the
// logo goes home, and everything else sits in one group at the top right. The
// buttons here are plain <button>s because the shared Button's default variant
// paints a gradient image over any background colour.
const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: userProfile } = useUserProfile();
  const { refreshPageData } = usePageRefresh();

  // Admins and posters get the post form; plain members are asked to request access.
  // While the profile is still loading, do not turn a signed-in user away.
  const canPostJobs = user && (!userProfile || canOpenPostPage(userProfile));

  const handlePostJobClick = () => {
    if (canPostJobs) {
      refreshPageData('/post-job');
      navigate('/post-job');
    } else if (user) {
      // Signed in but not a poster: their profile settings, where they can ask for access
      navigate('/profile?tab=profile-settings');
    } else {
      setShowPostJobModal(true);
    }
  };

  const postButton =
    'flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-brand-navy text-white hover:bg-brand-navy/90 transition-colors';

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-[#e8eaf0]">
      <div className="h-1 bg-brand-gold" />
      <div className="mx-auto max-w-[1440px] px-6 md:px-12">
        <div className="flex items-center justify-between h-16">
          {/* Logo: the way home */}
          <Link to="/" className="flex items-baseline gap-2.5">
            <span className="font-black tracking-[0.08em] text-brand-navy text-2xl">ISCSS</span>
            <span className="hidden sm:block text-[13px] font-semibold text-[#00a99b]">Jobs</span>
          </Link>

          {/* Desktop: everything on the right */}
          <div className="hidden md:flex items-center gap-5">
            <button type="button" className={postButton} onClick={handlePostJobClick}>
              <Plus className="w-4 h-4" />
              Post a job
            </button>
            <AuthButton />
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden p-2 text-brand-navy hover:bg-brand-surface rounded-md"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-[#e8eaf0] py-4 space-y-4">
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
