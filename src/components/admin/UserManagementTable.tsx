
import React from 'react';
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
import { User, Shield, ShieldOff, UserX, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const UserManagementTable = () => {
  const { data: allUsers, isLoading } = useAllUsers();
  const updatePermissions = useUpdateUserPermissions();
  const { toast } = useToast();

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
                <TableCell>
                  <div>
                    <div className="font-medium">{user.full_name || 'No name'}</div>
                    <div className="text-sm text-gray-500">{user.user_type}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{user.auth_users?.email || 'No email'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{user.institution || 'Not specified'}</span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {user.is_admin && (
                      <Badge variant="destructive">Admin</Badge>
                    )}
                    {user.is_approved_poster && (
                      <Badge variant="default">Job Poster</Badge>
                    )}
                    {user.approval_status === 'pending' && (
                      <Badge variant="outline">Pending</Badge>
                    )}
                    {user.approval_status === 'rejected' && (
                      <Badge variant="destructive">Rejected</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{formatDate(user.created_at)}</span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={user.is_admin ? "destructive" : "outline"}
                      onClick={() => handleToggleAdmin(user.id, user.is_admin || false)}
                      disabled={updatePermissions.isPending}
                    >
                      {user.is_admin ? (
                        <>
                          <ShieldOff className="w-4 h-4 mr-1" />
                          Remove Admin
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-1" />
                          Make Admin
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant={user.is_approved_poster ? "destructive" : "outline"}
                      onClick={() => handleTogglePoster(user.id, user.is_approved_poster || false)}
                      disabled={updatePermissions.isPending}
                    >
                      {user.is_approved_poster ? (
                        <>
                          <UserX className="w-4 h-4 mr-1" />
                          Revoke Poster
                        </>
                      ) : (
                        <>
                          <User className="w-4 h-4 mr-1" />
                          Make Poster
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
  );
};

export default UserManagementTable;
