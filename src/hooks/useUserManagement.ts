
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAdminCheck } from './useAdminCheck';
import { useAdminUserProfiles, type AdminUserProfile } from './useAdminUserProfiles';
import type { TablesUpdate } from '@/integrations/supabase/types';

type UserProfileUpdate = TablesUpdate<'user_profiles'>;

// Use the admin user profiles hook instead
export const useAllUsers = useAdminUserProfiles;

export const useUpdateUserPermissions = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      userId,
      updates
    }: {
      userId: string;
      updates: UserProfileUpdate;
    }) => {
      if (!user) throw new Error('User must be authenticated');

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-approvals'] });
      // Also invalidate user profile cache so changes reflect immediately
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile', variables.userId] });

      const action = variables.updates.is_admin !== undefined
        ? (variables.updates.is_admin ? 'granted admin' : 'revoked admin')
        : variables.updates.is_approved_poster !== undefined
        ? (variables.updates.is_approved_poster ? 'granted job poster' : 'changed to job seeker')
        : 'updated';

      toast({
        title: "Permissions Updated",
        description: `Successfully ${action} permissions for the user.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating permissions",
        description: "There was an error updating the user's permissions.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!user) throw new Error('User must be authenticated');

      // Use edge function for secure deletion with proper admin privileges
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return { userId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-approvals'] });

      toast({
        title: "User Deleted",
        description: "The user has been permanently deleted from the system.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting user",
        description: "There was an error deleting the user. Please try again.",
        variant: "destructive",
      });
    },
  });
};
