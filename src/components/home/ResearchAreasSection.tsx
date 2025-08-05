
import { Card, CardContent } from "@/components/ui/card";

const ResearchAreasSection = () => {
  const sponsors = [
    {
      name: "National Science Foundation",
      image: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
      url: "https://nsf.gov",
      description: "Supporting fundamental research and education"
    },
    {
      name: "Microsoft Research",
      image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
      url: "https://microsoft.com/research",
      description: "Advancing computational social science"
    },
    {
      name: "Stanford Digital Economy Lab",
      image: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
      url: "https://digitaleconomy.stanford.edu",
      description: "Research on digital transformation"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            Our <span className="text-gradient-primary">Partners</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Collaborating with leading institutions and organizations to advance computational social science.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {sponsors.map((sponsor, index) => (
            <Card 
              key={index} 
              className="modern-card modern-card-hover cursor-pointer group border-0 overflow-hidden"
              onClick={() => window.open(sponsor.url, '_blank')}
            >
              <CardContent className="p-0">
                <div className="aspect-[4/3] overflow-hidden">
                  <img 
                    src={sponsor.image} 
                    alt={sponsor.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-gradient-primary transition-all duration-300">
                    {sponsor.name}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {sponsor.description}
                  </p>
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
