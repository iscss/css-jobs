
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useAllUsers, useUpdateUserPermissions } from '@/hooks/useUserManagement';
import { User, Shield, ShieldOff, UserX, Mail, Eye, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import UserProfileModal from './UserProfileModal';
import type { AdminUserProfile } from '@/hooks/useAdminUserProfiles';

const UserManagementTable = () => {
  const { data: allUsers, isLoading } = useAllUsers();
  const updatePermissions = useUpdateUserPermissions();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<AdminUserProfile | null>(null);

  const handleToggleAdmin = (userId: string, currentStatus: boolean) => {
    updatePermissions.mutate({
      userId,
      updates: { is_admin: !currentStatus }
    });
  };

  const handleTogglePoster = (userId: string, currentStatus: boolean) => {
    updatePermissions.mutate({
      userId,
      updates: { is_approved_poster: !currentStatus }
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };


  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            All Users ({allUsers?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allUsers?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="max-w-48">
                    <div>
                      <div className="font-medium flex items-center gap-2 flex-wrap">
                        <span className="truncate max-w-32" title={user.full_name || 'No name'}>
                          {user.full_name || 'No name'}
                        </span>
                        {user.is_admin && (
                          <Badge variant="destructive" className="text-xs shrink-0">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{user.user_type}</div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-48">
                    <div className="space-y-1">
                       <div className="flex items-center gap-2">
                         <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                         <span className="text-sm truncate" title={user.email || user.auth_email || 'No email'}>
                           {user.email || user.auth_email || 'No email'}
                         </span>
                       </div>
                       <div className="flex items-center gap-1">
                         {user.email_confirmed_at ? (
                           <>
                             <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                             <span className="text-xs text-green-600">Verified</span>
                           </>
                         ) : (
                           <>
                             <XCircle className="w-3 h-3 text-red-500 shrink-0" />
                             <span className="text-xs text-red-600">Unverified</span>
                           </>
                         )}
                       </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-40">
                    <span className="text-sm truncate" title={user.institution || 'Not specified'}>
                      {user.institution || 'Not specified'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      {user.is_approved_poster && (
                        <Badge variant="default" className="text-xs">Job Poster</Badge>
                      )}
                      {user.approval_status === 'pending' && (
                        <Badge variant="outline" className="text-xs">Pending</Badge>
                      )}
                      {user.approval_status === 'rejected' && (
                        <Badge variant="destructive" className="text-xs">Rejected</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{formatDate(user.created_at)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedUser(user)}
                        className="flex items-center gap-1 text-xs px-2 py-1"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant={user.is_admin ? "destructive" : "outline"}
                        onClick={() => handleToggleAdmin(user.id, user.is_admin || false)}
                        disabled={updatePermissions.isPending}
                        className="text-xs px-2 py-1"
                      >
                        {user.is_admin ? (
                          <>
                            <ShieldOff className="w-3 h-3 mr-1" />
                            Remove
                          </>
                        ) : (
                          <>
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant={user.is_approved_poster ? "destructive" : "outline"}
                        onClick={() => handleTogglePoster(user.id, user.is_approved_poster || false)}
                        disabled={updatePermissions.isPending}
                        className="text-xs px-2 py-1"
                      >
                        {user.is_approved_poster ? (
                          <>
                            <UserX className="w-3 h-3 mr-1" />
                            Revoke
                          </>
                        ) : (
                          <>
                            <User className="w-3 h-3 mr-1" />
                            Poster
                          </>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserProfileModal
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </>
  );
};

export default UserManagementTable;
