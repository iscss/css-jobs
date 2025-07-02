
import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import JobCard from "@/components/jobs/JobCard";
import JobFilters from "@/components/jobs/JobFilters";

const Jobs = () => {
  // Mock job data
  const allJobs = [
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
      title: "Research Assistant in Digital Economics",
      institution: "University of Chicago",
      department: "Department of Economics",
      location: "Chicago, IL",
      type: "RA",
      deadline: "Nov 30, 2023",
      duration: "1 year",
      tags: ["Economics", "Digital Markets", "Causal Inference", "R"],
      description: "Support research on digital market regulation and platform economics. Responsibilities include data collection, statistical analysis, and literature reviews.",
      pi: "Prof. David Rodriguez",
      remote: false
    },
    {
      id: "4",
      title: "Assistant Professor in Computational Sociology",
      institution: "Harvard University",
      department: "Department of Sociology",
      location: "Cambridge, MA",
      type: "Faculty",
      deadline: "Mar 1, 2024",
      duration: "Permanent",
      tags: ["Sociology", "Social Media", "Inequality", "Mixed Methods"],
      description: "We invite applications for a tenure-track position in computational sociology with focus on social inequality and digital traces of social behavior.",
      pi: "Department of Sociology",
      remote: false
    },
    {
      id: "5",
      title: "Summer Research Internship in NLP",
      institution: "Google Research",
      department: "AI for Social Good",
      location: "Mountain View, CA",
      type: "Internship",
      deadline: "Jan 31, 2024",
      duration: "3 months",
      tags: ["NLP", "Machine Learning", "Social Good", "Python"],
      description: "Work on applying NLP methods to understand social issues and support policy research. Ideal for PhD students with strong technical backgrounds.",
      pi: "Dr. Lisa Wang",
      remote: true
    },
    {
      id: "6",
      title: "Postdoc in Causal Inference for Social Science",
      institution: "UC Berkeley",
      department: "School of Information",
      location: "Berkeley, CA",
      type: "Postdoc",
      deadline: "Dec 15, 2023",
      duration: "2 years",
      tags: ["Causal Inference", "Experiments", "Policy", "Statistics"],
      description: "Join our interdisciplinary team developing new methods for causal inference in social science research, with applications to education and health policy.",
      pi: "Dr. Jennifer Kim",
      remote: false
    }
  ];

  const [filteredJobs, setFilteredJobs] = useState(allJobs);

  const handleFiltersChange = (filters: any) => {
    let filtered = allJobs;

    // Filter by search term
    if (filters.search) {
      filtered = filtered.filter(job => 
        job.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        job.institution.toLowerCase().includes(filters.search.toLowerCase()) ||
        job.tags.some((tag: string) => tag.toLowerCase().includes(filters.search.toLowerCase()))
      );
    }

    // Filter by job types
    if (filters.types && filters.types.length > 0) {
      filtered = filtered.filter(job => filters.types.includes(job.type));
    }

    // Filter by topics
    if (filters.topics && filters.topics.length > 0) {
      filtered = filtered.filter(job => 
        job.tags.some((tag: string) => filters.topics.includes(tag))
      );
    }

    // Filter by remote
    if (filters.remote) {
      filtered = filtered.filter(job => job.remote);
    }

    setFilteredJobs(filtered);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar with filters */}
          <aside className="lg:w-80">
            <JobFilters onFiltersChange={handleFiltersChange} />
          </aside>

          {/* Main content */}
          <main className="flex-1">
            <div className="mb-6">
              <h1 className="text-3xl font-serif font-bold text-navy-800 mb-2">
                Browse Jobs
              </h1>
              <p className="text-gray-600">
                Showing {filteredJobs.length} of {allJobs.length} opportunities
              </p>
            </div>

            <div className="grid gap-6">
              {filteredJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>

            {filteredJobs.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No jobs found</h3>
                <p className="text-gray-600">Try adjusting your filters to see more results.</p>
              </div>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Jobs;
