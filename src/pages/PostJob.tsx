
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
    // Redirect job seekers to their profile page
    if (user && userProfile?.user_type === 'job_seeker') {
      navigate('/profile', { replace: true });
    }
  }, [user, userProfile, navigate]);

  // Don't render the form if user is a job seeker
  if (user && userProfile?.user_type === 'job_seeker') {
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
