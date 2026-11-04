
import { canOpenPostPage } from '@/lib/roles';
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import JobPostingForm from "@/components/jobs/JobPostingForm";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";

const PostJob = () => {
  const { user } = useAuth();
  const { data: userProfile } = useUserProfile();
  const navigate = useNavigate();

  useEffect(() => {
    // Send plain members to their profile page, where they can ask for posting
    // access. Admins and posters stay, whatever their stored account type says.
    if (user && userProfile && !canOpenPostPage(userProfile)) {
      navigate('/profile', { replace: true });
    }
  }, [user, userProfile, navigate]);

  // Don't render the form for a plain member
  if (user && userProfile && !canOpenPostPage(userProfile)) {
    return null;
  }

  return (
    <div className="page-wrapper">
      <Header />
      <main className="main-content py-8">
        <JobPostingForm />
      </main>
      <Footer />
    </div>
  );
};

export default PostJob;
