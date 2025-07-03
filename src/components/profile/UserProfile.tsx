
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserCheck, Briefcase, Users, Clock, CheckCircle, XCircle } from 'lucide-react';

interface ProfileFormData {
  full_name: string;
  institution: string;
  orcid_id: string;
  user_type: string;
}

const UserProfile = () => {
  const { user } = useAuth();
  const { data: profile, isLoading } = useUserProfile();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProfileFormData>();
  const watchedUserType = watch('user_type');

  useEffect(() => {
    if (profile) {
      setValue('full_name', profile.full_name || '');
      setValue('institution', profile.institution || '');
      setValue('orcid_id', profile.orcid_id || '');
      setValue('user_type', profile.user_type || 'job_seeker');
    }
  }, [profile, setValue]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setIsUpdating(true);
    try {
      const updateData: any = {
        id: user.id,
        full_name: data.full_name,
        institution: data.institution,
        orcid_id: data.orcid_id,
        updated_at: new Date().toISOString()
      };

      // If user type changed and they want posting privileges, set status to pending
      if (data.user_type !== profile?.user_type && data.user_type !== 'job_seeker') {
        updateData.user_type = data.user_type;
        updateData.approval_status = 'pending';
        updateData.requested_at = new Date().toISOString();
        updateData.is_approved_poster = false;
      } else if (data.user_type === 'job_seeker') {
        updateData.user_type = data.user_type;
        updateData.approval_status = 'approved';
        updateData.is_approved_poster = false;
      }

      const { error } = await supabase
        .from('user_profiles')
        .upsert(updateData);

      if (error) throw error;

      toast({
        title: "Profile updated successfully!",
        description: data.user_type !== 'job_seeker' && data.user_type !== profile?.user_type
          ? "Your profile has been updated. Job posting privileges require admin approval."
          : "Your profile information has been saved.",
      });
    } catch (error) {
      toast({
        title: "Error updating profile",
        description: "There was an error updating your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getApprovalStatusBadge = () => {
    if (!profile) return null;

    switch (profile.approval_status) {
      case 'approved':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending Approval
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">User Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                {...register('full_name', { required: 'Full name is required' })}
                placeholder="Enter your full name"
              />
              {errors.full_name && <p className="text-sm text-red-600">{errors.full_name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution">Institution</Label>
              <Input
                id="institution"
                {...register('institution')}
                placeholder="e.g., Stanford University"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orcid_id">ORCID ID</Label>
              <Input
                id="orcid_id"
                {...register('orcid_id')}
                placeholder="e.g., 0000-0000-0000-0000"
              />
              <p className="text-sm text-gray-600">
                Your ORCID identifier helps connect you with your research contributions.
              </p>
            </div>

            <div className="space-y-3">
              <Label>Account Type</Label>
              <RadioGroup 
                value={watchedUserType || 'job_seeker'} 
                onValueChange={(value) => setValue('user_type', value)}
              >
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value="job_seeker" id="job_seeker_profile" />
                  <Label htmlFor="job_seeker_profile" className="flex items-center gap-2 cursor-pointer flex-1">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-medium">Job Seeker</div>
                      <div className="text-sm text-gray-500">Browse and apply to research positions</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value="job_poster" id="job_poster_profile" />
                  <Label htmlFor="job_poster_profile" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Briefcase className="w-4 h-4 text-green-600" />
                    <div>
                      <div className="font-medium">Job Poster</div>
                      <div className="text-sm text-gray-500">Post research positions (requires admin approval)</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value="both" id="both_profile" />
                  <Label htmlFor="both_profile" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Users className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="font-medium">Both</div>
                      <div className="text-sm text-gray-500">Look for and post jobs (requires approval for posting)</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <h3 className="font-semibold text-blue-900 mb-2">Account Information</h3>
              <div className="space-y-2 text-sm">
                <p className="text-blue-800">
                  <span className="font-medium">Email:</span> {user?.email}
                </p>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-blue-800">Status:</span>
                  {getApprovalStatusBadge()}
                </div>
                {profile?.user_type !== 'job_seeker' && profile?.approval_status === 'pending' && (
                  <p className="text-blue-600 mt-2">
                    Your request for job posting privileges is pending admin approval. You'll be notified once reviewed.
                  </p>
                )}
                {profile?.user_type !== 'job_seeker' && profile?.approval_status === 'approved' && (
                  <p className="text-green-700 mt-2">
                    You have been approved to post job positions. You can now create and manage job postings.
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isUpdating}
              className="w-full"
            >
              {isUpdating ? 'Updating...' : 'Update Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;
