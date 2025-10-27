import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
    User,
    Mail,
    Building2,
    Calendar,
    Shield,
    CheckCircle,
    XCircle,
    Clock,
    Globe,
    GraduationCap,
    ExternalLink,
    Briefcase,
    Eye,
    Pause
} from 'lucide-react';
import { useUserJobsAdmin } from '@/hooks/useJobs';
import type { AdminUserProfile } from '@/hooks/useAdminUserProfiles';

interface UserProfileModalProps {
    user: AdminUserProfile | null;
    isOpen: boolean;
    onClose: () => void;
}

const UserProfileModal = ({ user, isOpen, onClose }: UserProfileModalProps) => {
    const { data: userJobs, isLoading: jobsLoading } = useUserJobsAdmin(user?.id || '');

    if (!user) return null;

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'long',
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

    const getApprovalStatusBadge = () => {
        switch (user.approval_status) {
            case 'approved':
                return (
                    <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approved
                    </Badge>
                );
            case 'pending':
                return (
                    <Badge className="bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                    </Badge>
                );
            case 'rejected':
                return (
                    <Badge className="bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3 mr-1" />
                        Rejected
                    </Badge>
                );
            default:
                return null;
        }
    };

    const getEmailVerificationBadge = () => {
        const isVerified = user.email_confirmed_at;

        if (isVerified) {
            return (
                <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                </Badge>
            );
        } else {
            return (
                <Badge className="bg-red-100 text-red-800">
                    <XCircle className="w-3 h-3 mr-1" />
                    Unverified
                </Badge>
            );
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        User Profile Details
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Header Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">{user.full_name || 'No name provided'}</h2>
                            <div className="flex gap-2">
                                {user.is_admin && (
                                    <Badge variant="destructive">
                                        <Shield className="w-3 h-3 mr-1" />
                                        Admin
                                    </Badge>
                                )}
                                {user.is_approved_poster && (
                                    <Badge variant="default">Job Poster</Badge>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                            <Badge className={getUserTypeColor(user.user_type || 'job_seeker')}>
                                {getUserTypeLabel(user.user_type || 'job_seeker')}
                            </Badge>
                            {getApprovalStatusBadge()}
                        </div>
                    </div>

                    <Separator />

                    {/* Contact Information */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Contact Information</h3>
                        <div className="grid gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-gray-500" />
                                    <span className="font-medium">Email:</span>
                                    <span>{user.email || user.auth_email || 'Not provided'}</span>
                                </div>
                                {getEmailVerificationBadge()}
                            </div>

                            {user.institution && (
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-gray-500" />
                                    <span className="font-medium">Institution:</span>
                                    <span>{user.institution}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Academic Information */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Academic Information</h3>
                        <div className="grid gap-3">
                            {user.orcid_id && (
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">ORCID ID:</span>
                                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                        {user.orcid_id}
                                    </span>
                                </div>
                            )}

                            {user.google_scholar_url && (
                                <div className="flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4 text-gray-500" />
                                    <span className="font-medium">Google Scholar:</span>
                                    <Button variant="link" className="p-0 h-auto" asChild>
                                        <a href={user.google_scholar_url} target="_blank" rel="noopener noreferrer">
                                            View Profile <ExternalLink className="w-3 h-3 ml-1" />
                                        </a>
                                    </Button>
                                </div>
                            )}

                            {user.website_url && (
                                <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-gray-500" />
                                    <span className="font-medium">Website:</span>
                                    <Button variant="link" className="p-0 h-auto" asChild>
                                        <a href={user.website_url} target="_blank" rel="noopener noreferrer">
                                            Visit Website <ExternalLink className="w-3 h-3 ml-1" />
                                        </a>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Account Timeline */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Account Timeline</h3>
                        <div className="grid gap-3 text-sm">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="font-medium">Account Created:</span>
                                <span>{formatDate(user.created_at)}</span>
                            </div>

                            {user.requested_at && (
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-500" />
                                    <span className="font-medium">Privileges Requested:</span>
                                    <span>{formatDate(user.requested_at)}</span>
                                </div>
                            )}

                            {user.approved_at && (
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-500" />
                                    <span className="font-medium">Approved At:</span>
                                    <span>{formatDate(user.approved_at)}</span>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="font-medium">Last Updated:</span>
                                <span>{formatDate(user.updated_at)}</span>
                            </div>

                            {user.email_confirmed_at && (
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-gray-500" />
                                    <span className="font-medium">Email Verified:</span>
                                    <span>{formatDate(user.email_confirmed_at)}</span>
                                </div>
                            )}

                            {user.last_sign_in_at && (
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-500" />
                                    <span className="font-medium">Last Sign In:</span>
                                    <span>{formatDate(user.last_sign_in_at)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Job Posts Information */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Briefcase className="w-5 h-5" />
                            Job Posts ({jobsLoading ? '...' : userJobs?.length || 0})
                        </h3>
                        
                        {jobsLoading ? (
                            <div className="space-y-2">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-16 w-full" />
                                ))}
                            </div>
                        ) : userJobs && userJobs.length > 0 ? (
                            <div className="space-y-3">
                                {userJobs.map((job) => (
                                    <div key={job.id} className="border rounded-lg p-3 bg-gray-50">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-medium truncate">{job.title}</h4>
                                                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{formatDate(job.created_at)}</span>
                                                    <span className="text-gray-400">•</span>
                                                    <span className="capitalize">{job.job_type}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1 shrink-0">
                                                {/* Approval Status Badge */}
                                                {job.approval_status === 'approved' && job.is_published && (
                                                    <Badge className="bg-green-100 text-green-800 text-xs">
                                                        Published
                                                    </Badge>
                                                )}
                                                {job.approval_status === 'pending' && (
                                                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                                        Pending
                                                    </Badge>
                                                )}
                                                {job.approval_status === 'rejected' && (
                                                    <Badge className="bg-red-100 text-red-800 text-xs">
                                                        Rejected
                                                    </Badge>
                                                )}
                                                {job.approval_status === 'draft' && (
                                                    <Badge variant="outline" className="text-xs">
                                                        Draft
                                                    </Badge>
                                                )}
                                                
                                                {/* Job Status Badge - show for all jobs based on approval status */}
                                                {(() => {
                                                    // If job is published, show actual job status
                                                    if (job.approval_status === 'approved' && job.is_published) {
                                                        const jobStatus = (job as Record<string, unknown>).job_status || 'active';
                                                        if (jobStatus === 'filled') {
                                                            return (
                                                                <Badge className="bg-green-100 text-green-800 text-xs border border-green-300">
                                                                    <CheckCircle className="w-2 h-2 mr-1" />
                                                                    Filled
                                                                </Badge>
                                                            );
                                                        } else if (jobStatus === 'inactive') {
                                                            return (
                                                                <Badge className="bg-gray-100 text-gray-800 text-xs border border-gray-300">
                                                                    <Pause className="w-2 h-2 mr-1" />
                                                                    Inactive
                                                                </Badge>
                                                            );
                                                        } else {
                                                            return (
                                                                <Badge className="bg-blue-100 text-blue-800 text-xs border border-blue-300">
                                                                    <Eye className="w-2 h-2 mr-1" />
                                                                    Active
                                                                </Badge>
                                                            );
                                                        }
                                                    } else {
                                                        // For draft, pending, or rejected jobs, they are inactive
                                                        return (
                                                            <Badge className="bg-gray-100 text-gray-800 text-xs border border-gray-300">
                                                                <Pause className="w-2 h-2 mr-1" />
                                                                Inactive
                                                            </Badge>
                                                        );
                                                    }
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-500">
                                <Briefcase className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                <p>No job posts found</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end mt-6">
                    <Button onClick={onClose} variant="outline">
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default UserProfileModal; 