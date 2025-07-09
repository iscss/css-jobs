
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock, Building, User, ExternalLink, FileText, Globe, Sparkles } from "lucide-react";
import { useState } from "react";

interface JobCardProps {
  job: {
    id: string;
    title: string;
    institution: string;
    department?: string;
    location: string;
    job_type: string;
    application_deadline?: string;
    duration?: string;
    job_tags?: Array<{ tag: string }>;
    description: string;
    requirements?: string;
    pi_name?: string;
    is_remote?: boolean;
    is_featured?: boolean;
    application_url?: string;
    contact_email?: string;
    created_at: string;
  };
}

const JobCard = ({ job }: JobCardProps) => {
  const [showFullDescription, setShowFullDescription] = useState(false);

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'phd': return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-200';
      case 'postdoc': return 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-200';
      case 'faculty': return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-purple-200';
      case 'ra': return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-200';
      case 'internship': return 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-pink-200';
      default: return 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-slate-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleApply = () => {
    if (job.application_url) {
      window.open(job.application_url, '_blank');
    } else if (job.contact_email) {
      window.location.href = `mailto:${job.contact_email}?subject=Application for ${job.title}`;
    }
  };

  const truncatedDescription = job.description.length > 300 
    ? job.description.substring(0, 300) + "..." 
    : job.description;

  const truncatedRequirements = job.requirements && job.requirements.length > 200 
    ? job.requirements.substring(0, 200) + "..." 
    : job.requirements;

  return (
    <Card className={`group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 border-0 shadow-lg ${
      job.is_featured 
        ? 'bg-gradient-to-br from-amber-50 via-white to-orange-50 ring-2 ring-amber-200 hover:ring-amber-300' 
        : 'bg-white hover:shadow-xl'
    }`}>
      {/* Featured ribbon */}
      {job.is_featured && (
        <div className="absolute -right-3 top-6 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-8 py-1 text-xs font-bold transform rotate-12 shadow-lg z-10">
          <Sparkles className="inline w-3 h-3 mr-1" />
          FEATURED
        </div>
      )}

      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-indigo-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      <CardHeader className="pb-4 relative">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <Badge className={`${getTypeColor(job.job_type)} font-bold px-4 py-2 shadow-lg`}>
                {job.job_type}
              </Badge>
              {job.is_remote && (
                <Badge variant="outline" className="border-2 border-green-500 text-green-700 bg-green-50 font-semibold px-3 py-1">
                  <Globe className="w-3 h-3 mr-1" />
                  Remote
                </Badge>
              )}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4 hover:text-indigo-600 transition-colors cursor-pointer leading-tight">
              {job.title}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Building className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{job.institution}</div>
                  {job.department && <div className="text-gray-600">{job.department}</div>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MapPin className="h-4 w-4 text-green-600" />
                </div>
                <span className="font-medium text-gray-700">{job.location}</span>
              </div>
              {job.application_deadline && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Calendar className="h-4 w-4 text-red-600" />
                  </div>
                  <span className="text-red-700 font-semibold">Due: {formatDate(job.application_deadline)}</span>
                </div>
              )}
              {job.pi_name && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <User className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-gray-700"><span className="font-medium">PI:</span> {job.pi_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-6 relative">
        {/* Description */}
        <div className="bg-gradient-to-br from-slate-50 via-white to-gray-50 rounded-xl p-6 border border-gray-100 shadow-sm">
          <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            Position Description
          </h4>
          <p className="text-gray-700 text-sm leading-relaxed">
            {showFullDescription ? job.description : truncatedDescription}
            {job.description.length > 300 && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-indigo-600 hover:text-indigo-800 ml-2 font-semibold transition-colors underline"
              >
                {showFullDescription ? "Show less" : "Read more"}
              </button>
            )}
          </p>
        </div>

        {/* Requirements */}
        {job.requirements && (
          <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 rounded-xl p-6 border border-blue-100 shadow-sm">
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <User className="h-4 w-4 text-indigo-600" />
              </div>
              Requirements & Qualifications
            </h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              {showFullDescription ? job.requirements : truncatedRequirements}
              {job.requirements.length > 200 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-blue-600 hover:text-blue-800 ml-2 font-semibold transition-colors underline"
                >
                  {showFullDescription ? "Show less" : "Read more"}
                </button>
              )}
            </p>
          </div>
        )}

        {/* Tags */}
        {job.job_tags && job.job_tags.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 text-sm">Research Areas & Keywords</h4>
            <div className="flex flex-wrap gap-2">
              {job.job_tags.slice(0, 8).map((tagObj, index) => (
                <Badge key={index} variant="secondary" className="text-xs bg-gradient-to-r from-gray-100 to-slate-100 hover:from-gray-200 hover:to-slate-200 transition-all duration-200 border border-gray-200 font-medium">
                  #{tagObj.tag}
                </Badge>
              ))}
              {job.job_tags.length > 8 && (
                <Badge variant="secondary" className="text-xs bg-gray-100 border border-gray-200">
                  +{job.job_tags.length - 8} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Additional Details */}
        {(job.duration || job.department) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 pt-4 border-t border-gray-100">
            {job.duration && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-4 w-4 text-orange-600" />
                </div>
                <span><span className="font-medium text-gray-900">Duration:</span> {job.duration}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-6 border-t border-gray-100">
          {(job.application_url || job.contact_email) && (
            <Button 
              onClick={handleApply}
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white font-bold px-8 py-3 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-3"
            >
              <ExternalLink className="h-5 w-5" />
              Apply Now
            </Button>
          )}
          <Button 
            variant="outline" 
            className="flex-1 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold"
            onClick={() => setShowFullDescription(!showFullDescription)}
          >
            {showFullDescription ? "Show Less Details" : "View Full Details"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobCard;
