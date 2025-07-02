
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const ResearchAreasSection = () => {
  const researchAreas = [
    {
      title: "Natural Language Processing",
      description: "Text analysis, sentiment analysis, and language models for social science research",
      tags: ["NLP", "Text Mining", "BERT", "GPT", "Sentiment Analysis"],
      count: "120+ jobs"
    },
    {
      title: "Network Science",
      description: "Social networks, graph theory, and complex systems analysis",
      tags: ["Social Networks", "Graph Theory", "Community Detection", "Centrality"],
      count: "85+ jobs"
    },
    {
      title: "Machine Learning",
      description: "Predictive modeling, classification, and pattern recognition in social data",
      tags: ["Supervised Learning", "Deep Learning", "Feature Engineering", "Python"],
      count: "150+ jobs"
    },
    {
      title: "Causal Inference",
      description: "Identifying causal relationships in observational and experimental data",
      tags: ["Causal Methods", "Experiments", "IV", "Matching", "DAGs"],
      count: "60+ jobs"
    },
    {
      title: "Digital Sociology",
      description: "Understanding social behavior through digital traces and online communities",
      tags: ["Social Media", "Digital Ethnography", "Online Communities", "Big Data"],
      count: "90+ jobs"
    },
    {
      title: "Political Science",
      description: "Electoral behavior, public opinion, and political institutions",
      tags: ["Electoral Analysis", "Public Opinion", "Democracy", "Polarization"],
      count: "75+ jobs"
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif font-bold text-navy-800 mb-4">
            Research Areas
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore opportunities across key areas of computational social science research.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {researchAreas.map((area, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-300 cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-navy-800 group-hover:text-navy-600 transition-colors">
                    {area.title}
                  </h3>
                  <Badge variant="secondary" className="text-xs bg-navy-100 text-navy-700">
                    {area.count}
                  </Badge>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                  {area.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {area.tags.map((tag, tagIndex) => (
                    <Badge key={tagIndex} variant="outline" className="text-xs hover:bg-navy-50">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ResearchAreasSection;
