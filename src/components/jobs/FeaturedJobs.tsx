
import JobCard from "./JobCard";

const FeaturedJobs = () => {
  // Mock data for featured jobs
  const featuredJobs = [
    {
      id: "1",
      title: "PhD Position in Computational Political Science",
      institution: "Stanford University",
      department: "Political Science",
      location: "Stanford, CA",
      type: "PhD",
      deadline: "Jan 15, 2024",
      duration: "5 years",
      tags: ["Political Science", "Machine Learning", "Text Analysis", "Democracy"],
      description: "We seek a motivated PhD student to join our lab investigating democratic institutions using computational methods. The position involves developing novel NLP approaches for analyzing political discourse and electoral behavior.",
      pi: "Dr. Sarah Johnson",
      remote: false,
      featured: true
    },
    {
      id: "2",
      title: "Postdoc in Social Network Analysis",
      institution: "MIT",
      department: "Institute for Data, Systems & Society",
      location: "Cambridge, MA",
      type: "Postdoc",
      deadline: "Dec 1, 2023",
      duration: "2 years",
      tags: ["Network Science", "Social Media", "Graph Theory", "Python"],
      description: "Join our team studying large-scale social networks and information diffusion. We're particularly interested in understanding how misinformation spreads through online communities.",
      pi: "Dr. Michael Chen",
      remote: true,
      featured: true
    },
    {
      id: "3",
      title: "Assistant Professor in Digital Sociology",
      institution: "University of Oxford",
      department: "Department of Sociology",
      location: "Oxford, UK",
      type: "Faculty",
      deadline: "Feb 28, 2024",
      duration: "Permanent",
      tags: ["Digital Sociology", "Social Media", "Inequality", "Mixed Methods"],
      description: "We invite applications for a tenure-track position focusing on digital sociology and computational social science methods. Candidates should have experience with big data approaches to studying social inequality.",
      pi: "Prof. Emma Williams",
      remote: false,
      featured: true
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif font-bold text-navy-800 mb-4">Featured Opportunities</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover exceptional research positions and academic opportunities from leading institutions worldwide.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedJobs;
