
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Star, MapPin, Globe } from "lucide-react";

interface JobFiltersProps {
  onFiltersChange: (filters: any) => void;
  currentFilters?: {
    search: string;
    types: string[];
    remote: boolean;
    featured: boolean;
    region: string;
    country: string;
  };
}

const JobFilters = ({ onFiltersChange, currentFilters }: JobFiltersProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");

  const jobTypes = ["PhD", "Postdoc", "Faculty", "Research Assistant", "Internship"];

  const regions = [
    { value: "north-america", label: "North America" },
    { value: "europe", label: "Europe" },
    { value: "asia", label: "Asia" },
    { value: "oceania", label: "Oceania" },
    { value: "south-america", label: "South America" },
    { value: "africa", label: "Africa" }
  ];

  const countries = [
    { value: "us", label: "United States", region: "north-america" },
    { value: "ca", label: "Canada", region: "north-america" },
    { value: "uk", label: "United Kingdom", region: "europe" },
    { value: "de", label: "Germany", region: "europe" },
    { value: "fr", label: "France", region: "europe" },
    { value: "nl", label: "Netherlands", region: "europe" },
    { value: "ch", label: "Switzerland", region: "europe" },
    { value: "se", label: "Sweden", region: "europe" },
    { value: "dk", label: "Denmark", region: "europe" },
    { value: "no", label: "Norway", region: "europe" },
    { value: "fi", label: "Finland", region: "europe" },
    { value: "it", label: "Italy", region: "europe" },
    { value: "es", label: "Spain", region: "europe" },
    { value: "au", label: "Australia", region: "oceania" },
    { value: "nz", label: "New Zealand", region: "oceania" },
    { value: "jp", label: "Japan", region: "asia" },
    { value: "sg", label: "Singapore", region: "asia" },
    { value: "kr", label: "South Korea", region: "asia" },
    { value: "cn", label: "China", region: "asia" },
    { value: "in", label: "India", region: "asia" }
  ];

  // Sync internal state with external filter changes
  useEffect(() => {
    if (currentFilters) {
      setSearchTerm(currentFilters.search);
      setSelectedTypes(currentFilters.types);
      setRemoteOnly(currentFilters.remote);
      setFeaturedOnly(currentFilters.featured);
      setSelectedRegion(currentFilters.region);
      setSelectedCountry(currentFilters.country);
    }
  }, [currentFilters]);

  const updateFilters = (overrides = {}) => {
    onFiltersChange({
      types: selectedTypes,
      remote: remoteOnly,
      featured: featuredOnly,
      region: selectedRegion,
      country: selectedCountry,
      search: searchTerm,
      ...overrides
    });
  };

  const handleTypeChange = (type: string, checked: boolean) => {
    const newTypes = checked
      ? [...selectedTypes, type]
      : selectedTypes.filter(t => t !== type);
    setSelectedTypes(newTypes);
    updateFilters({ types: newTypes });
  };

  const handleSearch = () => {
    updateFilters();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTypes([]);
    setRemoteOnly(false);
    setFeaturedOnly(false);
    setSelectedRegion("all");
    setSelectedCountry("all");
    onFiltersChange({ types: [], remote: false, featured: false, region: "all", country: "all", search: "" });
  };

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="text-lg text-navy-800 flex items-center gap-2">
          <Search className="w-5 h-5" />
          Filter Jobs
        </CardTitle>
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

        {/* Featured Jobs - Made prominent */}
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="featured"
              checked={featuredOnly}
              onCheckedChange={(checked) => {
                setFeaturedOnly(checked as boolean);
                updateFilters({ featured: checked as boolean });
              }}
            />
            <label htmlFor="featured" className="text-sm font-medium text-amber-800 cursor-pointer flex items-center gap-2">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              Featured positions only
            </label>
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

        {/* Location Filters */}
        <div>
          <h4 className="font-medium text-navy-800 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Location
          </h4>
          <div className="space-y-3">
            {/* Region Filter */}
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Region</label>
              <Select value={selectedRegion} onValueChange={(value) => {
                setSelectedRegion(value);
                setSelectedCountry("all"); // Clear country when region changes
                updateFilters({ region: value, country: "all" });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Any region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any region</SelectItem>
                  {regions.map((region) => (
                    <SelectItem key={region.value} value={region.value}>
                      <div className="flex items-center gap-2">
                        <Globe className="w-3 h-3" />
                        {region.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country Filter */}
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Country</label>
              <Select value={selectedCountry} onValueChange={(value) => {
                setSelectedCountry(value);
                updateFilters({ country: value });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Any country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any country</SelectItem>
                  {countries
                    .filter(country => !selectedRegion || selectedRegion === "all" || country.region === selectedRegion)
                    .map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        {country.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
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
                updateFilters({ remote: checked as boolean });
              }}
            />
            <label htmlFor="remote" className="text-sm text-gray-700 cursor-pointer">
              Remote positions only
            </label>
          </div>
        </div>



      </CardContent>
    </Card>
  );
};

export default JobFilters;
