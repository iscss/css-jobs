import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCreateJob } from '@/hooks/useJobs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface JobFormData {
  title: string;
  institution: string;
  department: string;
  location: string;
  job_type: 'PhD' | 'Postdoc' | 'Faculty' | 'RA' | 'Internship' | 'Other';
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

const JobPostingForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: userProfile, isLoading: profileLoading } = useUserProfile();
  const createJobMutation = useCreateJob();
  const [isRemote, setIsRemote] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<JobFormData>();

  const onSubmit = async (data: JobFormData) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to post a job.",
        variant: "destructive",
      });
      return;
    }

    if (!userProfile?.is_approved_poster) {
      toast({
        title: "Approval required",
        description: "You need to be approved as a job poster before you can post jobs. Please contact an administrator.",
        variant: "destructive",
      });
      return;
    }

    try {
      const jobData = {
        ...data,
        is_remote: isRemote,
        application_deadline: data.application_deadline || null,
        is_published: true,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []
      };

      await createJobMutation.mutateAsync(jobData);
      
      toast({
        title: "Job posted successfully!",
        description: "Your job posting has been created and is now live.",
      });
      
      navigate('/jobs');
    } catch (error) {
      toast({
        title: "Error posting job",
        description: "There was an error creating your job posting. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please sign in to post a job.</p>
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Loading your profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getApprovalStatusAlert = () => {
    if (!userProfile) return null;

    const status = userProfile.approval_status;
    const isApprovedPoster = userProfile.is_approved_poster;

    if (isApprovedPoster) {
      return (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            You are approved to post jobs. You can create job postings below.
          </AlertDescription>
        </Alert>
      );
    }

    if (status === 'pending') {
      return (
        <Alert className="border-yellow-200 bg-yellow-50">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Your job posting approval is pending review. You cannot post jobs until approved by an administrator.
          </AlertDescription>
        </Alert>
      );
    }

    if (status === 'rejected') {
      return (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Your job posting request was rejected. Please contact an administrator for more information.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          You need to request approval to post jobs. Please update your profile to request job posting privileges.
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Post a New Job</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {getApprovalStatusAlert()}
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                <Select onValueChange={(value) => setValue('job_type', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PhD">PhD</SelectItem>
                    <SelectItem value="Postdoc">Postdoc</SelectItem>
                    <SelectItem value="Faculty">Faculty</SelectItem>
                    <SelectItem value="RA">Research Assistant</SelectItem>
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

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  {...register('location', { required: 'Location is required' })}
                  placeholder="e.g., Stanford, CA, USA"
                />
                {errors.location && <p className="text-sm text-red-600">{errors.location.message}</p>}
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

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/jobs')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createJobMutation.isPending || !userProfile?.is_approved_poster}
              >
                {createJobMutation.isPending ? 'Posting...' : 'Post Job'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobPostingForm;
