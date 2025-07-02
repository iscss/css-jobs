
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import JobPostingForm from "@/components/jobs/JobPostingForm";

const PostJob = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <Header />
      <main className="py-8">
        <JobPostingForm />
      </main>
      <Footer />
    </div>
  );
};

export default PostJob;
