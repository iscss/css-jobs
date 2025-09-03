import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Heart, Mail, Github, Globe, Users, Lightbulb, Sparkles } from "lucide-react";

const About = () => {
  const teamMembers = [
    {
      name: "Anders Giovanni Møller",
      role: "Tech",
      photo: "/team/anders.jpg",
      icon: <Globe className="w-6 h-6" />
    },
    {
      name: "Ceren Budak",
      role: "Advisor",
      photo: "/team/ceren.jpg",
      icon: <Lightbulb className="w-6 h-6" />,
    },
    // {
    //   name: "Ingmar Weber",
    //   role: "Advisor",
    //   photo: "/team/ingmar.jpg",
    //   icon: <Users className="w-6 h-6" />
    // }
  ];

  return (
    <>
      <div className="page-wrapper">
        <Header />
        <main className="main-content">
          {/* Hero Section */}
          <section className="relative bg-gradient-to-br from-slate-50 via-white to-indigo-50 pt-20 pb-32 overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
            <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-purple-300 to-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 right-4 w-72 h-72 bg-gradient-to-r from-yellow-300 to-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-gradient-to-r from-pink-300 to-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

            <div className="container mx-auto px-4 relative">
              <div className="text-center max-w-4xl mx-auto">
                {/* Badge */}
                <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full text-sm font-medium mb-8 border border-indigo-200 shadow-sm">
                  Built with ❤️ for the CSS Community
                </div>

                {/* Main heading */}
                <h1 className="text-5xl md:text-6xl font-serif font-bold text-slate-900 mb-6 leading-tight">
                  About
                  <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    CSS Jobs
                  </span>
                </h1>

                {/* Mission Statement */}
                <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed">
                  A <span className="font-semibold text-slate-700">community-driven platform</span> connecting researchers, institutions, and opportunities across the global computational social science network.
                </p>
              </div>
            </div>
          </section>

          {/* Mission Section */}
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                  <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
                    Our <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Mission</span>
                  </h2>
                </div>

                <div className="grid md gap-12">
                  <div className="space-y-2 text-center">
                    <p className="text-lg text-slate-700 leading-relaxed">
                      CSS Jobs exists to <strong>serve the computational social science community</strong> by making it easier for students and researchers to discover opportunities and for institutions to find the right talent.
                    </p>
                    <p className="text-lg text-slate-700 leading-relaxed">
                      We believe in <strong>open, accessible research</strong> and strive to connect people across geographical and institutional boundaries.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Team Section */}
          <section className="py-20 bg-gradient-to-br from-slate-50 to-indigo-50">
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
                  Meet Our <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Team</span>
                </h2>
                <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                  CSS Jobs is the result of collaborative effort and shared vision for the computational social science community.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                {teamMembers.map((member, index) => (
                  <Card
                    key={index}
                    className={`modern-card border-0 overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl ${member.highlight
                      ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200'
                      : 'bg-white'
                      }`}
                  >
                    <CardContent className="p-0">
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={member.photo}
                          alt={member.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to icon if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div
                          className={`w-full h-full items-center justify-center ${member.highlight
                            ? 'bg-gradient-to-br from-purple-100 to-pink-100 text-purple-600'
                            : 'bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600'
                            } hidden`}
                        >
                          {member.icon}
                        </div>
                      </div>
                      <div className="p-8 text-center">
                        <h3 className="text-xl font-bold text-slate-800 mb-2">
                          {member.name}
                        </h3>
                        <p className={`text-md font-semibold mb-4 ${member.highlight ? 'text-purple-600' : 'text-indigo-600'
                          }`}>
                          {member.role}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
                  Get In <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Touch</span>
                </h2>
                <p className="text-xl text-slate-600 mb-12 leading-relaxed">
                  Have questions, suggestions, or want to contribute? We'd love to hear from the community.
                </p>

                <div className="max-w-md mx-auto">
                  <Card className="modern-card modern-card-hover border-0 bg-gradient-to-br from-indigo-50 to-purple-50">
                    <CardContent className="p-8 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 rounded-full mb-4">
                        <Mail className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">Email Us</h3>
                      <p className="text-slate-600 mb-4">For questions, feedback, or collaboration</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = 'mailto:contact@css-jobs.com'}
                        className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                      >
                        Send Email
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default About;