
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAllUsers, useUpdateUserPermissions, useDeleteUser } from '@/hooks/useUserManagement';
import { User, Shield, ShieldOff, UserX, Mail, Eye, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import UserProfileModal from './UserProfileModal';
import type { AdminUserProfile } from '@/hooks/useAdminUserProfiles';

const UserManagementTable = () => {
  const { data: allUsers, isLoading } = useAllUsers();
  const updatePermissions = useUpdateUserPermissions();
  const deleteUser = useDeleteUser();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<AdminUserProfile | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUserProfile | null>(null);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminAction, setAdminAction] = useState<{ userId: string; isAdmin: boolean; userName: string } | null>(null);

  const handleToggleAdmin = (userId: string, currentStatus: boolean, userName: string) => {
    setAdminAction({ userId, isAdmin: !currentStatus, userName });
    setAdminDialogOpen(true);
  };

  const confirmAdminToggle = () => {
    if (!adminAction) return;
    
    updatePermissions.mutate({
      userId: adminAction.userId,
      updates: { is_admin: adminAction.isAdmin }
    });
    setAdminDialogOpen(false);
    setAdminAction(null);
  };

  const handleDeleteUser = (user: AdminUserProfile) => {
    // Check if user is trying to delete themselves
    if (user.id === currentUser?.id) {
      toast({
        title: "Cannot delete yourself",
        description: "You cannot delete your own account.",
        variant: "destructive",
      });
      return;
    }

    // Check if user is trying to delete another admin
    if (user.is_admin) {
      toast({
        title: "Cannot delete admin users",
        description: "Admin users cannot be deleted. Remove admin privileges first.",
        variant: "destructive",
      });
      return;
    }

    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = () => {
    if (!userToDelete) return;
    
    deleteUser.mutate(userToDelete.id);
    setDeleteDialogOpen(false);
    setUserToDelete(null);
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
                        onClick={() => handleToggleAdmin(user.id, user.is_admin || false, user.full_name || 'Unknown')}
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
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteUser(user)}
                        disabled={deleteUser.isPending || user.id === currentUser?.id || user.is_admin}
                        className="text-xs px-2 py-1"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete the user "{userToDelete?.full_name || 'Unknown'}"? 
              This action cannot be undone and will remove all their data from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {adminAction?.isAdmin ? 'Grant Admin Privileges' : 'Revoke Admin Privileges'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {adminAction?.isAdmin ? 'grant admin privileges to' : 'revoke admin privileges from'} 
              "{adminAction?.userName}"? This will change their access level in the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAdminToggle}>
              {adminAction?.isAdmin ? 'Grant Admin' : 'Revoke Admin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserManagementTable;
