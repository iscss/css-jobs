
import { TrendingUp, Building2, Globe, Users } from "lucide-react";

const StatsSection = () => {
  const stats = [
    {
      number: "500+",
      label: "Job Listings",
      description: "Active opportunities across all career stages",
      icon: TrendingUp,
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      number: "150+",
      label: "Universities",
      description: "Top academic institutions worldwide",
      icon: Building2,
      gradient: "from-purple-500 to-pink-500"
    },
    {
      number: "50+",
      label: "Countries",
      description: "Global reach and opportunities",
      icon: Globe,
      gradient: "from-green-500 to-emerald-500"
    },
    {
      number: "10k+",
      label: "Researchers",
      description: "Active community members",
      icon: Users,
      gradient: "from-orange-500 to-red-500"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            Connecting the{" "}
            <span className="text-gradient-primary">CSS Community</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Join thousands of researchers, students, and institutions in building the future of computational social science.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="text-center group">
                <div className="relative mb-6">
                  <div className={`w-16 h-16 bg-gradient-to-r ${stat.gradient} rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                
                <div className="text-4xl lg:text-5xl font-bold text-slate-800 mb-2 group-hover:text-gradient-primary transition-all duration-300">
                  {stat.number}
                </div>
                <div className="text-lg font-semibold text-slate-700 mb-2">
                  {stat.label}
                </div>
                <div className="text-sm text-slate-500 leading-relaxed">
                  {stat.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
