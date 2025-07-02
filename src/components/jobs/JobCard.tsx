
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock, Building, User, ExternalLink, FileText } from "lucide-react";
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
      case 'phd': return 'bg-blue-500 text-white';
      case 'postdoc': return 'bg-green-500 text-white';
      case 'faculty': return 'bg-purple-500 text-white';
      case 'ra': return 'bg-orange-500 text-white';
      case 'internship': return 'bg-pink-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
    <Card className={`hover:shadow-xl transition-all duration-300 border-0 shadow-lg ${
      job.is_featured ? 'ring-2 ring-indigo-400 bg-gradient-to-br from-indigo-50 via-white to-purple-50' : 'bg-white'
    }`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Badge className={`${getTypeColor(job.job_type)} font-semibold px-3 py-1`}>
                {job.job_type}
              </Badge>
              {job.is_remote && (
                <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
                  Remote
                </Badge>
              )}
              {job.is_featured && (
                <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold">
                  ⭐ Featured
                </Badge>
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3 hover:text-indigo-600 transition-colors cursor-pointer">
              {job.title}
            </h3>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
              <div className="flex items-center gap-1.5">
                <Building className="h-4 w-4 text-indigo-500" />
                <span className="font-medium">{job.institution}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-green-500" />
                <span>{job.location}</span>
              </div>
              {job.application_deadline && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-red-500" />
                  <span className="text-red-600 font-medium">Due: {formatDate(job.application_deadline)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Description */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Description
          </h4>
          <p className="text-gray-700 text-sm leading-relaxed">
            {showFullDescription ? job.description : truncatedDescription}
            {job.description.length > 300 && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-indigo-600 hover:text-indigo-800 ml-2 font-medium transition-colors"
              >
                {showFullDescription ? "Show less" : "Read more"}
              </button>
            )}
          </p>
        </div>

        {/* Requirements */}
        {job.requirements && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              Requirements
            </h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              {showFullDescription ? job.requirements : truncatedRequirements}
              {job.requirements.length > 200 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-blue-600 hover:text-blue-800 ml-2 font-medium transition-colors"
                >
                  {showFullDescription ? "Show less" : "Read more"}
                </button>
              )}
            </p>
          </div>
        )}

        {/* Tags */}
        {job.job_tags && job.job_tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {job.job_tags.slice(0, 6).map((tagObj, index) => (
              <Badge key={index} variant="secondary" className="text-xs bg-gray-100 hover:bg-gray-200 transition-colors">
                #{tagObj.tag}
              </Badge>
            ))}
            {job.job_tags.length > 6 && (
              <Badge variant="secondary" className="text-xs bg-gray-100">
                +{job.job_tags.length - 6} more
              </Badge>
            )}
          </div>
        )}

        {/* Additional Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 pt-2 border-t border-gray-100">
          {job.pi_name && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-purple-500" />
              <span><span className="font-medium">PI:</span> {job.pi_name}</span>
            </div>
          )}
          {job.duration && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span><span className="font-medium">Duration:</span> {job.duration}</span>
            </div>
          )}
          {job.department && (
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-blue-500" />
              <span><span className="font-medium">Department:</span> {job.department}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          {(job.application_url || job.contact_email) && (
            <Button 
              onClick={handleApply}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Apply Now
            </Button>
          )}
          <Button 
            variant="outline" 
            className="flex-1 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
            onClick={() => setShowFullDescription(!showFullDescription)}
          >
            {showFullDescription ? "Show Less" : "View Details"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobCard;
