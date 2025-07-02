
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock, Building, User, ExternalLink } from "lucide-react";
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
      case 'phd': return 'bg-blue-100 text-blue-800';
      case 'postdoc': return 'bg-green-100 text-green-800';
      case 'faculty': return 'bg-purple-100 text-purple-800';
      case 'ra': return 'bg-orange-100 text-orange-800';
      case 'internship': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const truncatedDescription = job.description.length > 200 
    ? job.description.substring(0, 200) + "..." 
    : job.description;

  return (
    <Card className={`hover:shadow-lg transition-all duration-300 ${job.is_featured ? 'ring-2 ring-navy-200 bg-gradient-to-br from-navy-50/50 to-white' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getTypeColor(job.job_type)}>
                {job.job_type}
              </Badge>
              {job.is_remote && (
                <Badge variant="outline" className="text-xs">
                  Remote
                </Badge>
              )}
              {job.is_featured && (
                <Badge className="bg-navy-600 text-white text-xs">
                  Featured
                </Badge>
              )}
            </div>
            <h3 className="text-lg font-semibold text-navy-800 hover:text-navy-600 transition-colors">
              {job.title}
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
              <div className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                <span>{job.institution}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{job.location}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-gray-700 text-sm mb-4">
          {showFullDescription ? job.description : truncatedDescription}
          {job.description.length > 200 && (
            <button
              onClick={() => setShowFullDescription(!showFullDescription)}
              className="text-indigo-600 hover:text-indigo-800 ml-2 font-medium"
            >
              {showFullDescription ? "Show less" : "Read more"}
            </button>
          )}
        </p>

        {/* Tags */}
        {job.job_tags && job.job_tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {job.job_tags.slice(0, 4).map((tagObj, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tagObj.tag}
              </Badge>
            ))}
            {job.job_tags.length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{job.job_tags.length - 4} more
              </Badge>
            )}
          </div>
        )}

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 mb-4">
          {job.pi_name && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>PI: {job.pi_name}</span>
            </div>
          )}
          {job.duration && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{job.duration}</span>
            </div>
          )}
          {job.application_deadline && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Due: {formatDate(job.application_deadline)}</span>
            </div>
          )}
          {job.department && (
            <div className="flex items-center gap-1">
              <Building className="h-3 w-3" />
              <span>{job.department}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {(job.application_url || job.contact_email) && (
            <Button 
              onClick={handleApply}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Apply Now
            </Button>
          )}
          <Button 
            variant="outline" 
            className="flex-1 hover:bg-navy-50 hover:border-navy-300"
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
