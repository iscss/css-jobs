
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import JobPostingForm from "@/components/jobs/JobPostingForm";

const PostJob = () => {
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
