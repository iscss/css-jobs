
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUpdateApprovalStatus } from '@/hooks/useAdminApprovals';
import { Check, X, User, Building2, Calendar, Mail, Info, Eye, Shield, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import UserProfileModal from './UserProfileModal';
import type { AdminUserProfile } from '@/hooks/useAdminUserProfiles';

interface PendingApprovalCardProps {
  profile: AdminUserProfile;
}

const PendingApprovalCard = ({ profile }: PendingApprovalCardProps) => {
  const updateApprovalMutation = useUpdateApprovalStatus();
  const { toast } = useToast();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case 'job_poster': return 'bg-green-100 text-green-800';
      case 'both': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case 'job_poster': return 'Job Poster';
      case 'both': return 'Job Seeker & Poster';
      default: return type;
    }
  };

  const getEmailVerificationBadge = () => {
    if (profile.email_confirmed_at) {
      return (
        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Email Verified
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          Email Unverified
        </Badge>
      );
    }
  };

  const handleApprove = () => {
    updateApprovalMutation.mutate({
      userId: profile.id,
      status: 'approved',
      userType: profile.user_type || 'job_seeker'
    });
  };

  const handleReject = () => {
    updateApprovalMutation.mutate({
      userId: profile.id,
      status: 'rejected',
      userType: profile.user_type || 'job_seeker'
    });
  };

  const handleRequestMoreInfo = () => {
    // For now, we'll just show a toast with instructions
    // In a real implementation, this would send an email
    toast({
      title: "Feature Coming Soon",
      description: "Email functionality will be implemented to request more information from users.",
    });
  };

  return (
    <>
      <Card className="border border-gray-200 hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2 flex-wrap">
                    <User className="w-5 h-5 text-gray-500 shrink-0" />
                    <span className="truncate" title={profile.full_name || 'No name provided'}>
                      {profile.full_name || 'No name provided'}
                    </span>
                    {profile.is_admin && (
                      <Badge variant="destructive" className="shrink-0">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge className={getUserTypeColor(profile.user_type || 'job_seeker')}>
                      {getUserTypeLabel(profile.user_type || 'job_seeker')}
                    </Badge>
                    <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-800">
                      Pending
                    </Badge>
                    {getEmailVerificationBadge()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600 min-w-0">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="truncate" title={profile.email || 'Email not available'}>
                    Email: {profile.email || 'Email not available'}
                  </span>
                </div>

                {profile.institution && (
                  <div className="flex items-center gap-2 text-gray-600 min-w-0">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span className="truncate" title={profile.institution}>
                      {profile.institution}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Requested: {formatDate(profile.requested_at)}</span>
                </div>

                {profile.orcid_id && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="font-medium">ORCID:</span>
                    <span className="font-mono text-xs">{profile.orcid_id}</span>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Request Type:</span> User is requesting{' '}
                  {profile.user_type === 'job_poster'
                    ? 'job posting privileges'
                    : profile.user_type === 'both'
                      ? 'both job seeking and posting privileges'
                      : 'job seeking access'
                  } and requires admin approval.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 ml-4">
              <Button
                onClick={() => setShowProfileModal(true)}
                variant="outline"
                className="flex items-center gap-2"
                size="sm"
              >
                <Eye className="w-4 h-4" />
                View Profile
              </Button>

              <Button
                onClick={handleApprove}
                disabled={updateApprovalMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                size="sm"
              >
                <Check className="w-4 h-4" />
                Approve
              </Button>

              <Button
                onClick={handleReject}
                disabled={updateApprovalMutation.isPending}
                variant="destructive"
                className="flex items-center gap-2"
                size="sm"
              >
                <X className="w-4 h-4" />
                Reject
              </Button>

              <Button
                onClick={handleRequestMoreInfo}
                disabled={updateApprovalMutation.isPending}
                variant="outline"
                className="flex items-center gap-2"
                size="sm"
              >
                <Info className="w-4 h-4" />
                Request Info
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <UserProfileModal
        user={profile}
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </>
  );
};

export default PendingApprovalCard;
