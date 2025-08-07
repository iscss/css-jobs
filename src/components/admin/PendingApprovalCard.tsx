
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUpdateApprovalStatus } from '@/hooks/useAdminApprovals';
import { Check, X, User, Building2, Calendar, Mail, Info, Eye, Shield, CheckCircle, XCircle, MoreHorizontal } from 'lucide-react';
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
      case 'job_seeker': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case 'job_poster': return 'Job Poster';
      case 'job_seeker': return 'Job Seeker';
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
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-8">
          <div className="flex items-start gap-6">
            {/* User Avatar */}
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-8 h-8 text-primary" />
            </div>

            {/* Main Content */}
            <div className="flex-1 space-y-4">
              {/* Header */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2" title={profile.full_name || 'No name provided'}>
                      {profile.full_name || 'No name provided'}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="font-medium">
                        {getUserTypeLabel(profile.user_type || 'job_seeker')}
                      </Badge>
                      <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-800">
                        Pending Review
                      </Badge>
                      {profile.is_admin && (
                        <Badge variant="destructive">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      onClick={() => setShowProfileModal(true)}
                      variant="outline"
                      size="sm"
                      className="h-9"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Profile
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 p-0"
                          disabled={updateApprovalMutation.isPending}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={handleApprove}
                          className="cursor-pointer text-green-600 focus:text-green-600"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Approve Request
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={handleReject}
                          className="cursor-pointer text-red-600 focus:text-red-600"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Reject Request
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={handleRequestMoreInfo}
                          className="cursor-pointer"
                        >
                          <Info className="w-4 h-4 mr-2" />
                          Request More Info
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Contact & Verification Status */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm" title={profile.email || 'Email not available'}>
                      {profile.email || 'Email not available'}
                    </span>
                  </div>
                  {getEmailVerificationBadge()}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.institution && (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Institution</div>
                      <div className="text-sm font-medium" title={profile.institution}>
                        {profile.institution}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Requested</div>
                    <div className="text-sm font-medium">{formatDate(profile.requested_at)}</div>
                  </div>
                </div>

                {profile.orcid_id && (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg md:col-span-2">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <span className="text-xs font-bold text-muted-foreground">ID</span>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">ORCID</div>
                      <div className="text-sm font-mono">{profile.orcid_id}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Request Summary */}
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
                <div className="text-sm">
                  <span className="font-medium text-primary">Access Request:</span>{' '}
                  <span className="text-muted-foreground">
                    User is requesting{' '}
                    {profile.user_type === 'job_poster'
                      ? 'job posting privileges'
                        : 'job seeking access'
                    } and requires admin approval.
                  </span>
                </div>
              </div>
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
