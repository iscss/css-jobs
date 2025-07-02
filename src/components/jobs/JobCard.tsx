
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock, Building, User } from "lucide-react";

interface JobCardProps {
  job: {
    id: string;
    title: string;
    institution: string;
    department: string;
    location: string;
    type: string;
    deadline: string;
    duration: string;
    tags: string[];
    description: string;
    pi: string;
    remote: boolean;
    featured?: boolean;
  };
}

const JobCard = ({ job }: JobCardProps) => {
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

  return (
    <Card className={`hover:shadow-lg transition-all duration-300 cursor-pointer ${job.featured ? 'ring-2 ring-navy-200 bg-gradient-to-br from-navy-50/50 to-white' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getTypeColor(job.type)}>
                {job.type}
              </Badge>
              {job.remote && (
                <Badge variant="outline" className="text-xs">
                  Remote
                </Badge>
              )}
              {job.featured && (
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
        <p className="text-gray-700 text-sm mb-4 line-clamp-3">
          {job.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {job.tags.slice(0, 4).map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {job.tags.length > 4 && (
            <Badge variant="secondary" className="text-xs">
              +{job.tags.length - 4} more
            </Badge>
          )}
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>PI: {job.pi}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{job.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Due: {job.deadline}</span>
          </div>
          <div className="flex items-center gap-1">
            <Building className="h-3 w-3" />
            <span>{job.department}</span>
          </div>
        </div>

        <Button variant="outline" className="w-full hover:bg-navy-50 hover:border-navy-300">
          View Details
        </Button>
      </CardContent>
    </Card>
  );
};

export default JobCard;
