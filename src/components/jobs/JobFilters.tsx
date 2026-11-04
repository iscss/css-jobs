
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface JobFilters {
  search: string;
  types: string[];
  remote: boolean;
  featured: boolean;
  region: string;
  country: string;
}

interface JobFiltersProps {
  onFiltersChange: (filters: Partial<JobFilters>) => void;
  currentFilters?: JobFilters;
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

  const label = 'text-[11px] font-bold uppercase tracking-[0.1em] text-[#999] mt-[22px] mb-2.5';
  const row = 'flex items-center gap-[9px] text-[13px] text-[#444] my-[9px]';

  return (
    <div className="border border-[#e3e7ea] rounded-md bg-white px-5 py-[18px]">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999] h-4 w-4" />
        <Input
          placeholder="Search keywords..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="pl-9 h-10 text-[13px] border-[#d6dce0] rounded"
        />
      </div>

      {/* Position type */}
      <h4 className={label}>Position type</h4>
      {jobTypes.map((type) => (
        <div key={type} className={row}>
          <Checkbox
            id={type}
            checked={selectedTypes.includes(type)}
            onCheckedChange={(checked) => handleTypeChange(type, checked as boolean)}
          />
          <label htmlFor={type} className="cursor-pointer">{type}</label>
        </div>
      ))}

      {/* Location */}
      <h4 className={label}>Location</h4>
      <div className={row}>
        <Checkbox
          id="remote"
          checked={remoteOnly}
          onCheckedChange={(checked) => {
            setRemoteOnly(checked as boolean);
            updateFilters({ remote: checked as boolean });
          }}
        />
        <label htmlFor="remote" className="cursor-pointer">Remote positions only</label>
      </div>
      <div className="space-y-2.5 mt-3">
        <Select value={selectedRegion} onValueChange={(value) => {
          setSelectedRegion(value);
          setSelectedCountry("all"); // Clear country when region changes
          updateFilters({ region: value, country: "all" });
        }}>
          <SelectTrigger className="h-9 text-[13px] border-[#d6dce0] rounded">
            <SelectValue placeholder="Any region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any region</SelectItem>
            {regions.map((region) => (
              <SelectItem key={region.value} value={region.value}>{region.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedCountry} onValueChange={(value) => {
          setSelectedCountry(value);
          updateFilters({ country: value });
        }}>
          <SelectTrigger className="h-9 text-[13px] border-[#d6dce0] rounded">
            <SelectValue placeholder="Any country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any country</SelectItem>
            {countries
              .filter(country => !selectedRegion || selectedRegion === "all" || country.region === selectedRegion)
              .map((country) => (
                <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Featured */}
      <h4 className={label}>Highlights</h4>
      <div className={row}>
        <Checkbox
          id="featured"
          checked={featuredOnly}
          onCheckedChange={(checked) => {
            setFeaturedOnly(checked as boolean);
            updateFilters({ featured: checked as boolean });
          }}
        />
        <label htmlFor="featured" className="cursor-pointer">Featured positions only</label>
      </div>
    </div>
  );
};

export default JobFilters;
