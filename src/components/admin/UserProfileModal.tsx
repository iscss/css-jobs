import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
    ExternalLink
} from 'lucide-react';
import type { AdminUserProfile } from '@/hooks/useAdminUserProfiles';

interface UserProfileModalProps {
    user: AdminUserProfile | null;
    isOpen: boolean;
    onClose: () => void;
}

const UserProfileModal = ({ user, isOpen, onClose }: UserProfileModalProps) => {
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
            case 'both': return 'bg-purple-100 text-purple-800';
            case 'job_seeker': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getUserTypeLabel = (type: string) => {
        switch (type) {
            case 'job_poster': return 'Job Poster';
            case 'both': return 'Job Seeker & Poster';
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