
const StatsSection = () => {
  const stats = [
    {
      number: "500+",
      label: "Job Listings",
      description: "Active opportunities across all career stages"
    },
    {
      number: "150+",
      label: "Universities",
      description: "Top academic institutions worldwide"
    },
    {
      number: "50+",
      label: "Countries",
      description: "Global reach and opportunities"
    },
    {
      number: "10k+",
      label: "Researchers",
      description: "Active community members"
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-academic-50 to-navy-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif font-bold text-navy-800 mb-4">
            Connecting the CSS Community
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Join thousands of researchers, students, and institutions in building the future of computational social science.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl lg:text-5xl font-bold text-navy-700 mb-2">
                {stat.number}
              </div>
              <div className="text-lg font-semibold text-navy-800 mb-1">
                {stat.label}
              </div>
              <div className="text-sm text-gray-600">
                {stat.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
