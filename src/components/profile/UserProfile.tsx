
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile, useUpdateUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import { accountRole, roleBadgeClass, roleLabel } from '@/lib/roles';
import { Users, Clock, CheckCircle, XCircle, Globe, GraduationCap } from 'lucide-react';

interface ProfileFormData {
  full_name: string;
  institution: string;
  orcid_id: string;
  google_scholar_url: string;
  website_url: string;
}

const UserProfile = () => {
  const { user } = useAuth();
  const { data: profile, isLoading } = useUserProfile();
  const updateProfile = useUpdateUserProfile();
  const { toast } = useToast();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfileFormData>();
  const role = accountRole(profile);

  useEffect(() => {
    if (profile) {
      setValue('full_name', profile.full_name || '');
      setValue('institution', profile.institution || '');
      setValue('orcid_id', profile.orcid_id || '');
      setValue('google_scholar_url', profile.google_scholar_url || '');
      setValue('website_url', profile.website_url || '');
    }
  }, [profile, setValue]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    try {
      const updateData: Record<string, unknown> = {
        full_name: data.full_name,
        institution: data.institution,
        orcid_id: data.orcid_id,
        google_scholar_url: data.google_scholar_url,
        website_url: data.website_url,
        updated_at: new Date().toISOString()
      };

      // The account type is not edited here: it follows from what the account
      // can do (see requestPostingAccess for asking to post jobs).
      await updateProfile.mutateAsync(updateData);

      toast({
        title: "Profile updated successfully!",
        description: "Your profile information has been saved.",
      });
    } catch (error) {
      toast({
        title: "Error updating profile",
        description: "There was an error updating your profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Posting access is automatic. A poster who wants to review jobs and manage users
  // asks for admin access, and an admin grants or dismisses the request.
  const requestAdminAccess = async () => {
    try {
      await updateProfile.mutateAsync({
        admin_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      toast({
        title: "Request sent",
        description: "An admin will review your request for admin access.",
      });
    } catch (error) {
      toast({
        title: "Could not send the request",
        description: "Please try again.",
        variant: "destructive",
      });
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

            <div className="space-y-2">
              <Label htmlFor="google_scholar_url" className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Google Scholar Profile
              </Label>
              <Input
                id="google_scholar_url"
                {...register('google_scholar_url')}
                placeholder="https://scholar.google.com/citations?user=..."
                type="url"
              />
              <p className="text-sm text-gray-600">
                Link to your Google Scholar profile to showcase your publications.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website_url" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Personal Website
              </Label>
              <Input
                id="website_url"
                {...register('website_url')}
                placeholder="https://yourwebsite.com"
                type="url"
              />
              <p className="text-sm text-gray-600">
                Your personal or academic website.
              </p>
            </div>

            <div className="space-y-3">
              <Label>Account type</Label>
              <div className="flex items-center gap-2">
                <Badge className={roleBadgeClass(profile)}>{roleLabel(profile)}</Badge>
              </div>
              {role === 'poster' && (
                <div className="space-y-2">
                  {(profile as Record<string, unknown>)?.admin_requested_at ? (
                    <p className="text-sm text-gray-600">
                      You have asked for admin access. An admin will review it and you will see the Admin dashboard in your account menu once it is granted.
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">
                        You can post jobs. Admins also review jobs and manage users. If you need that, ask for it and an admin will decide.
                      </p>
                      <Button type="button" variant="outline" onClick={requestAdminAccess} disabled={updateProfile.isPending}>
                        Request admin access
                      </Button>
                    </>
                  )}
                </div>
              )}
              {(role === 'member' || (role === 'pending_poster' && profile?.approval_status === 'rejected')) && (
                <p className="text-sm text-gray-600">
                  Your job posting access has been removed. If you think this is a mistake, please contact an admin.
                </p>
              )}
            </div>

            <div className="bg-brand-surface p-4 rounded-lg space-y-3">
              <h3 className="font-semibold text-brand-navy mb-2">Account Information</h3>
              <div className="space-y-2 text-sm">
                <p className="text-brand-navy">
                  <span className="font-medium">Email:</span> {user?.email}
                </p>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-brand-navy">Status:</span>
                  {getApprovalStatusBadge()}
                </div>
                {role === 'pending_poster' && profile?.approval_status === 'pending' && (
                  <p className="text-brand-navy mt-2">
                    Your request for job posting privileges is pending admin approval. You'll be notified once reviewed.
                  </p>
                )}
                {role === 'admin' && (
                  <p className="text-green-700 mt-2">
                    ✓ Administrator: you can publish jobs directly and manage users and jobs.
                  </p>
                )}
                {role === 'poster' && (
                  <div className="space-y-2 mt-2">
                    {(profile as Record<string, unknown>).can_publish_directly ? (
                      <p className="text-green-700">
                        ✓ Account approved for job posting with direct publishing privileges ({(profile as Record<string, unknown>).approved_jobs_count || 0} approved jobs)
                      </p>
                    ) : (
                      <p className="text-orange-700">
                        Account approved for job posting - jobs require admin approval before publishing ({(profile as Record<string, unknown>).approved_jobs_count || 0}/3 approved jobs needed for direct publishing)
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={updateProfile.isPending}
              className="w-full"
            >
              {updateProfile.isPending ? 'Updating...' : 'Update Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;
