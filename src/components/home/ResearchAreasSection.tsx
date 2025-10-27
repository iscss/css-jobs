
import { Card, CardContent } from "@/components/ui/card";

const ResearchAreasSection = () => {
  const sponsors = [
    {
      name: "ISCSS",
      image: "/sponsors/ISCSS-Logo.png",
      url: "https://iscss.org/",
      description: "The International Society for Computational Social Science"
    },
    // {
    //   name: "IC2S2",
    //   image: "/sponsors/IC2S2-Logo-White.png",
    //   url: "https://ic2s2.org/",
    //   description: "The International Conference on Computational Social Science"
    // },
    {
      name: "ICWSM",
      image: "/sponsors/ICWSM-2025.png",
      url: "https://icwsm.org/",
      description: "International AAAI Conference on Web and Social Media"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            Made by and for the <span className="text-gradient-primary">community</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Supported by
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {sponsors.map((sponsor, index) => (
            <Card
              key={index}
              className="modern-card modern-card-hover cursor-pointer group border-0 overflow-hidden"
              onClick={() => window.open(sponsor.url, '_blank')}
            >
              <CardContent className="p-0">
                <div className="aspect-[4/4] overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-8">
                  <img
                    src={sponsor.image}
                    alt={sponsor.name}
                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
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
