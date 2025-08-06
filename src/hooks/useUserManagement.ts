
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

      const action = variables.updates.is_admin !== undefined
        ? (variables.updates.is_admin ? 'granted admin' : 'revoked admin')
        : (variables.updates.is_approved_poster ? 'granted poster' : 'revoked poster');

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
