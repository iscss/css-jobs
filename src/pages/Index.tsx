
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import FeaturedJobs from "@/components/jobs/FeaturedJobs";
import StatsSection from "@/components/home/StatsSection";
import ResearchAreasSection from "@/components/home/ResearchAreasSection";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      <FeaturedJobs />
      <ResearchAreasSection />
      <StatsSection />
      <Footer />
    </div>
  );
};

export default Index;
