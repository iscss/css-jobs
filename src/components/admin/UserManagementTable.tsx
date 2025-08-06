
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { User, Shield, ShieldOff, UserX, Mail, Eye, CheckCircle, XCircle, Trash2, MoreHorizontal, Building2 } from 'lucide-react';
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
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-3 text-xl">
            <User className="w-6 h-6" />
            All Users ({allUsers?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="pl-6 py-4 font-semibold">User</TableHead>
                <TableHead className="py-4 font-semibold">Contact</TableHead>
                <TableHead className="py-4 font-semibold">Institution</TableHead>
                <TableHead className="py-4 font-semibold">Status</TableHead>
                <TableHead className="py-4 font-semibold">Joined</TableHead>
                <TableHead className="pr-6 py-4 font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allUsers?.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="pl-6 py-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-base" title={user.full_name || 'No name'}>
                            {user.full_name || 'No name'}
                          </div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {user.user_type?.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      {user.is_admin && (
                        <Badge variant="destructive" className="ml-13">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm" title={user.email || user.auth_email || 'No email'}>
                          {user.email || user.auth_email || 'No email'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.email_confirmed_at ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-xs text-green-600 font-medium">Verified</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-xs text-red-600 font-medium">Unverified</span>
                          </>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm" title={user.institution || 'Not specified'}>
                        {user.institution || 'Not specified'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="flex flex-col gap-2">
                      {user.is_approved_poster && (
                        <Badge variant="default" className="w-fit">Job Poster</Badge>
                      )}
                      {user.approval_status === 'pending' && (
                        <Badge variant="outline" className="w-fit">Pending Approval</Badge>
                      )}
                      {user.approval_status === 'rejected' && (
                        <Badge variant="destructive" className="w-fit">Rejected</Badge>
                      )}
                      {user.approval_status === 'approved' && !user.is_approved_poster && (
                        <Badge variant="secondary" className="w-fit">Job Seeker</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <span className="text-sm text-muted-foreground">{formatDate(user.created_at)}</span>
                  </TableCell>
                  <TableCell className="pr-6 py-6">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedUser(user)}
                        className="h-8 px-3"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            disabled={updatePermissions.isPending || deleteUser.isPending}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => handleToggleAdmin(user.id, user.is_admin || false, user.full_name || 'Unknown')}
                            className="cursor-pointer"
                          >
                            {user.is_admin ? (
                              <>
                                <ShieldOff className="w-4 h-4 mr-2" />
                                Remove Admin
                              </>
                            ) : (
                              <>
                                <Shield className="w-4 h-4 mr-2" />
                                Grant Admin
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleTogglePoster(user.id, user.is_approved_poster || false)}
                            className="cursor-pointer"
                          >
                            {user.is_approved_poster ? (
                              <>
                                <UserX className="w-4 h-4 mr-2" />
                                Revoke Poster
                              </>
                            ) : (
                              <>
                                <User className="w-4 h-4 mr-2" />
                                Grant Poster
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user)}
                            disabled={user.id === currentUser?.id || user.is_admin}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
