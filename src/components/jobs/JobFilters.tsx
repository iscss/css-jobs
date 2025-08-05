
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, X } from "lucide-react";

interface JobFiltersProps {
  onFiltersChange: (filters: any) => void;
}

const JobFilters = ({ onFiltersChange }: JobFiltersProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [remoteOnly, setRemoteOnly] = useState(false);

  const jobTypes = ["PhD", "Postdoc", "Faculty", "RA", "Internship"];
  const topics = ["NLP", "Network Science", "Machine Learning", "Causal Inference", "Social Media", "Political Science", "Economics", "Sociology"];

  const handleTypeChange = (type: string, checked: boolean) => {
    const newTypes = checked 
      ? [...selectedTypes, type]
      : selectedTypes.filter(t => t !== type);
    setSelectedTypes(newTypes);
    onFiltersChange({ types: newTypes, topics: selectedTopics, remote: remoteOnly, search: searchTerm });
  };

  const handleTopicChange = (topic: string, checked: boolean) => {
    const newTopics = checked 
      ? [...selectedTopics, topic]
      : selectedTopics.filter(t => t !== topic);
    setSelectedTopics(newTopics);
    onFiltersChange({ types: selectedTypes, topics: newTopics, remote: remoteOnly, search: searchTerm });
  };

  const handleSearch = () => {
    onFiltersChange({ types: selectedTypes, topics: selectedTopics, remote: remoteOnly, search: searchTerm });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTypes([]);
    setSelectedTopics([]);
    setRemoteOnly(false);
    onFiltersChange({ types: [], topics: [], remote: false, search: "" });
  };

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="text-lg text-navy-800">Filter Jobs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
        </div>

        {/* Job Types */}
        <div>
          <h4 className="font-medium text-navy-800 mb-3">Position Type</h4>
          <div className="space-y-2">
            {jobTypes.map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox 
                  id={type}
                  checked={selectedTypes.includes(type)}
                  onCheckedChange={(checked) => handleTypeChange(type, checked as boolean)}
                />
                <label htmlFor={type} className="text-sm text-gray-700 cursor-pointer">
                  {type}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Research Topics */}
        <div>
          <h4 className="font-medium text-navy-800 mb-3">Research Areas</h4>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <Badge
                key={topic}
                variant={selectedTopics.includes(topic) ? "default" : "outline"}
                className={`cursor-pointer transition-colors ${
                  selectedTopics.includes(topic) 
                    ? "bg-navy-600 hover:bg-navy-700" 
                    : "hover:bg-navy-50 hover:border-navy-300"
                }`}
                onClick={() => handleTopicChange(topic, !selectedTopics.includes(topic))}
              >
                {topic}
              </Badge>
            ))}
          </div>
        </div>

        {/* Remote Work */}
        <div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="remote"
              checked={remoteOnly}
              onCheckedChange={(checked) => {
                setRemoteOnly(checked as boolean);
                onFiltersChange({ types: selectedTypes, topics: selectedTopics, remote: checked, search: searchTerm });
              }}
            />
            <label htmlFor="remote" className="text-sm text-gray-700 cursor-pointer">
              Remote positions only
            </label>
          </div>
        </div>

        {/* Active Filters */}
        {(selectedTypes.length > 0 || selectedTopics.length > 0 || remoteOnly || searchTerm) && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-navy-800">Active Filters</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedTypes.map((type) => (
                <Badge key={type} variant="secondary" className="flex items-center gap-1">
                  {type}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleTypeChange(type, false)}
                  />
                </Badge>
              ))}
              {selectedTopics.map((topic) => (
                <Badge key={topic} variant="secondary" className="flex items-center gap-1">
                  {topic}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleTopicChange(topic, false)}
                  />
                </Badge>
              ))}
              {remoteOnly && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Remote
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setRemoteOnly(false)}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default JobFilters;
