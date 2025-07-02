
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Network, BarChart3, Search, Smartphone, Vote } from "lucide-react";

const ResearchAreasSection = () => {
  const researchAreas = [
    {
      title: "Natural Language Processing",
      description: "Text analysis, sentiment analysis, and language models for social science research",
      tags: ["NLP", "Text Mining", "BERT", "GPT", "Sentiment Analysis"],
      count: "120+ jobs",
      icon: Brain,
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      title: "Network Science",
      description: "Social networks, graph theory, and complex systems analysis",
      tags: ["Social Networks", "Graph Theory", "Community Detection", "Centrality"],
      count: "85+ jobs",
      icon: Network,
      gradient: "from-purple-500 to-pink-500"
    },
    {
      title: "Machine Learning",
      description: "Predictive modeling, classification, and pattern recognition in social data",
      tags: ["Supervised Learning", "Deep Learning", "Feature Engineering", "Python"],
      count: "150+ jobs",
      icon: BarChart3,
      gradient: "from-green-500 to-emerald-500"
    },
    {
      title: "Causal Inference",
      description: "Identifying causal relationships in observational and experimental data",
      tags: ["Causal Methods", "Experiments", "IV", "Matching", "DAGs"],
      count: "60+ jobs",
      icon: Search,
      gradient: "from-orange-500 to-red-500"
    },
    {
      title: "Digital Sociology",
      description: "Understanding social behavior through digital traces and online communities",
      tags: ["Social Media", "Digital Ethnography", "Online Communities", "Big Data"],
      count: "90+ jobs",
      icon: Smartphone,
      gradient: "from-indigo-500 to-purple-500"
    },
    {
      title: "Political Science",
      description: "Electoral behavior, public opinion, and political institutions",
      tags: ["Electoral Analysis", "Public Opinion", "Democracy", "Polarization"],
      count: "75+ jobs",
      icon: Vote,
      gradient: "from-teal-500 to-cyan-500"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            Research <span className="text-gradient-primary">Areas</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Explore opportunities across key areas of computational social science research.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {researchAreas.map((area, index) => {
            const IconComponent = area.icon;
            return (
              <Card key={index} className="modern-card modern-card-hover cursor-pointer group border-0">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-12 h-12 bg-gradient-to-r ${area.gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="secondary" className="bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 font-medium border-0">
                      {area.count}
                    </Badge>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-800 mb-4 group-hover:text-gradient-primary transition-all duration-300">
                    {area.title}
                  </h3>
                  
                  <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                    {area.description}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {area.tags.map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="outline" className="text-xs hover:bg-indigo-50 hover:border-indigo-200 transition-colors border-slate-200 text-slate-600">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ResearchAreasSection;
