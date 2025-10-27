import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { Tables } from '@/integrations/supabase/types';
import { MapPin, Globe, X } from 'lucide-react';

type Job = Tables<'jobs'> & {
  job_tags: { id: string; tag: string; }[]
};

interface JobFormData {
  title: string;
  institution: string;
  department: string;
  location: string;
  country: string;
  region: string;
  job_type: 'PhD' | 'Postdoc' | 'Faculty' | 'Research Assistant' | 'Internship' | 'Other';
  description: string;
  requirements: string;
  application_deadline: string;
  duration: string;
  application_url: string;
  contact_email: string;
  pi_name: string;
  funding_source: string;
  is_remote: boolean;
  tags: string;
}

interface EditJobModalProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
}

// Define constants outside component to avoid re-creating on each render
const regions = [
  { value: "north-america", label: "North America" },
  { value: "europe", label: "Europe" },
  { value: "asia", label: "Asia" },
  { value: "oceania", label: "Oceania" },
  { value: "south-america", label: "South America" },
  { value: "africa", label: "Africa" }
];

const countries = [
    // North America
    { value: "us", label: "United States", region: "north-america" },
    { value: "ca", label: "Canada", region: "north-america" },
    { value: "mx", label: "Mexico", region: "north-america" },

    // Europe
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
    { value: "at", label: "Austria", region: "europe" },
    { value: "be", label: "Belgium", region: "europe" },
    { value: "ie", label: "Ireland", region: "europe" },
    { value: "pt", label: "Portugal", region: "europe" },

    // Asia
    { value: "jp", label: "Japan", region: "asia" },
    { value: "sg", label: "Singapore", region: "asia" },
    { value: "kr", label: "South Korea", region: "asia" },
    { value: "cn", label: "China", region: "asia" },
    { value: "in", label: "India", region: "asia" },
    { value: "hk", label: "Hong Kong", region: "asia" },
    { value: "tw", label: "Taiwan", region: "asia" },
    { value: "th", label: "Thailand", region: "asia" },
    { value: "my", label: "Malaysia", region: "asia" },

    // Oceania
    { value: "au", label: "Australia", region: "oceania" },
    { value: "nz", label: "New Zealand", region: "oceania" },

    // South America
    { value: "br", label: "Brazil", region: "south-america" },
    { value: "ar", label: "Argentina", region: "south-america" },
    { value: "cl", label: "Chile", region: "south-america" },
    { value: "co", label: "Colombia", region: "south-america" },
    { value: "pe", label: "Peru", region: "south-america" },

    // Africa
    { value: "za", label: "South Africa", region: "africa" },
    { value: "eg", label: "Egypt", region: "africa" },
    { value: "ng", label: "Nigeria", region: "africa" },
    { value: "ke", label: "Kenya", region: "africa" },
    { value: "gh", label: "Ghana", region: "africa" },
    { value: "ma", label: "Morocco", region: "africa" },
    { value: "tn", label: "Tunisia", region: "africa" },
    { value: "et", label: "Ethiopia", region: "africa" }
  ];

const EditJobModal = ({ job, isOpen, onClose }: EditJobModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemote, setIsRemote] = useState(job.is_remote || false);
  const [selectedCountry, setSelectedCountry] = useState("none");
  const [selectedRegion, setSelectedRegion] = useState("none");

  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<JobFormData>();

  useEffect(() => {
    if (job) {
      reset({
        title: job.title,
        institution: job.institution,
        department: job.department || '',
        location: job.location,
        job_type: job.job_type as JobFormData['job_type'],
        description: job.description,
        requirements: job.requirements || '',
        application_deadline: job.application_deadline || '',
        duration: job.duration || '',
        application_url: job.application_url || '',
        contact_email: job.contact_email || '',
        pi_name: job.pi_name || '',
        funding_source: job.funding_source || '',
        tags: job.job_tags?.map(tag => tag.tag).join(', ') || ''
      });
      setIsRemote(job.is_remote || false);
      setValue('job_type', job.job_type as JobFormData['job_type']);

      // Try to detect region/country from existing location
      const location = job.location.toLowerCase();
      let detectedCountry = "none";
      let detectedRegion = "none";

      // Check for country matches in location text
      for (const country of countries) {
        if (location.includes(country.label.toLowerCase())) {
          detectedCountry = country.value;
          detectedRegion = country.region;
          break;
        }
      }

      setSelectedCountry(detectedCountry);
      setSelectedRegion(detectedRegion);
    }
  }, [job, reset, setValue]);

  const onSubmit = async (data: JobFormData, isDraft = false) => {
    setIsSubmitting(true);
    try {
      // Enhance location data with structured info
      let enhancedLocation = data.location;
      if (selectedCountry && selectedCountry !== "none" && selectedRegion && selectedRegion !== "none") {
        const country = countries.find(c => c.value === selectedCountry);
        const region = regions.find(r => r.value === selectedRegion);

        // If location doesn't already contain country info, append it
        if (country && !enhancedLocation.toLowerCase().includes(country.label.toLowerCase())) {
          enhancedLocation = `${enhancedLocation}, ${country.label}`;
        }
      }

      // Update the job
      const { error: jobError } = await supabase
        .from('jobs')
        .update({
          title: data.title,
          institution: data.institution,
          department: data.department,
          location: enhancedLocation,
          job_type: data.job_type,
          description: data.description,
          requirements: data.requirements,
          application_deadline: data.application_deadline || null,
          duration: data.duration,
          application_url: data.application_url,
          contact_email: data.contact_email,
          pi_name: data.pi_name,
          funding_source: data.funding_source,
          is_remote: isRemote,
          is_published: isDraft ? false : (job.is_published || false),
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (jobError) throw jobError;

      // Handle tags
      if (data.tags) {
        // Delete existing tags
        await supabase
          .from('job_tags')
          .delete()
          .eq('job_id', job.id);

        // Insert new tags
        const tags = data.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        if (tags.length > 0) {
          const { error: tagsError } = await supabase
            .from('job_tags')
            .insert(tags.map(tag => ({ job_id: job.id, tag })));

          if (tagsError) throw tagsError;
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['user-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });

      toast({
        title: "Job updated successfully!",
        description: "Your job posting has been updated.",
      });

      onClose();
    } catch (error) {
      console.error('Error updating job:', error);
      toast({
        title: "Error updating job",
        description: "There was an error updating your job posting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Job Post</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => onSubmit(data, false))} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                {...register('title', { required: 'Job title is required' })}
                placeholder="e.g., PhD Position in Computational Social Science"
              />
              {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="job_type">Job Type *</Label>
              <Select onValueChange={(value) => setValue('job_type', value as JobFormData['job_type'])} defaultValue={job.job_type}>
                <SelectTrigger>
                  <SelectValue placeholder="Select job type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PhD">PhD</SelectItem>
                  <SelectItem value="Postdoc">Postdoc</SelectItem>
                  <SelectItem value="Faculty">Faculty</SelectItem>
                  <SelectItem value="Research Assistant">Research Assistant</SelectItem>
                  <SelectItem value="Internship">Internship</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution">Institution *</Label>
              <Input
                id="institution"
                {...register('institution', { required: 'Institution is required' })}
                placeholder="e.g., Stanford University"
              />
              {errors.institution && <p className="text-sm text-red-600">{errors.institution.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                {...register('department')}
                placeholder="e.g., Computer Science"
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location *
                </Label>
                <Input
                  id="location"
                  {...register('location', { required: 'Location is required' })}
                  placeholder="e.g., Stanford, CA (City, State/Province)"
                />
                {errors.location && <p className="text-sm text-red-600">{errors.location.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Region (Optional)</Label>
                  <Select value={selectedRegion} onValueChange={(value) => {
                    setSelectedRegion(value);
                    setSelectedCountry("none"); // Clear country when region changes
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <div className="flex items-center gap-2 text-gray-500">
                          <X className="w-3 h-3" />
                          No region selected
                        </div>
                      </SelectItem>
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

                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Country (Optional)</Label>
                  <Select value={selectedCountry} onValueChange={(value) => {
                    setSelectedCountry(value);
                    // Auto-select region when country is selected
                    if (value !== "none") {
                      const country = countries.find(c => c.value === value);
                      if (country && country.region !== selectedRegion) {
                        setSelectedRegion(country.region);
                      }
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <div className="flex items-center gap-2 text-gray-500">
                          <X className="w-3 h-3" />
                          No country selected
                        </div>
                      </SelectItem>
                      {countries
                        .filter(country => selectedRegion === "none" || country.region === selectedRegion)
                        .map((country) => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                <strong>Note:</strong> The structured region/country helps improve search and filtering.
                If you don't select these, users can still find your position through the location text.
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pi_name">Principal Investigator</Label>
              <Input
                id="pi_name"
                {...register('pi_name')}
                placeholder="e.g., Dr. Jane Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                {...register('duration')}
                placeholder="e.g., 3 years, 6 months"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="application_deadline">Application Deadline</Label>
              <Input
                id="application_deadline"
                type="date"
                {...register('application_deadline')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="application_url">Application URL</Label>
              <Input
                id="application_url"
                type="url"
                {...register('application_url')}
                placeholder="https://example.com/apply"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                {...register('contact_email')}
                placeholder="contact@institution.edu"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="funding_source">Funding Source</Label>
              <Input
                id="funding_source"
                {...register('funding_source')}
                placeholder="e.g., NSF Grant #123456"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                {...register('tags')}
                placeholder="e.g., machine learning, social networks, NLP"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Job Description *</Label>
              <Textarea
                id="description"
                {...register('description', { required: 'Job description is required' })}
                placeholder="Provide a detailed description of the position..."
                rows={6}
              />
              {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">Requirements</Label>
              <Textarea
                id="requirements"
                {...register('requirements')}
                placeholder="List the qualifications and requirements..."
                rows={4}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_remote"
              checked={isRemote}
              onCheckedChange={(checked) => setIsRemote(checked === true)}
            />
            <Label htmlFor="is_remote">This is a remote position</Label>
          </div>

          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSubmit((data) => onSubmit(data, true))}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save as Draft'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Job'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditJobModal;