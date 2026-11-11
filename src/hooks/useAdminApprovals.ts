
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAdminCheck } from './useAdminCheck';
import type { AdminUserProfile } from './useAdminUserProfiles';
import { adminUpdate } from '@/lib/roles';

// The admin queue for people: accounts that asked for admin access. (Posting access
// is automatic, so there is no longer a queue for it.)
export const useAdminApprovals = () => {
  const { user } = useAuth();
  const { data: isAdmin } = useAdminCheck();

  return useQuery({
    queryKey: ['admin-approvals'],
    queryFn: async (): Promise<AdminUserProfile[]> => {
      if (!user || !isAdmin) throw new Error('User must be authenticated admin');

      // The list function carries the email and sign-in details; the request time is
      // read from the table directly (an admin can read every profile).
      const [{ data: profiles, error: profilesError }, { data: requests, error: requestsError }] =
        await Promise.all([
          supabase.rpc('get_admin_user_profiles'),
          supabase.from('user_profiles').select('id, admin_requested_at').not('admin_requested_at', 'is', null),
        ]);

      if (profilesError) throw profilesError;
      if (requestsError) throw requestsError;

      const askedAt = new Map((requests || []).map((r) => [r.id, r.admin_requested_at as string]));
      return (profiles || [])
        .filter((profile: AdminUserProfile) => askedAt.has(profile.id) && !profile.is_admin)
        .map((profile: AdminUserProfile) => ({ ...profile, admin_requested_at: askedAt.get(profile.id) }));
    },
    enabled: !!user && !!isAdmin,
  });
};

// Grant or dismiss a request for admin access.
export const useResolveAdminRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, grant }: { userId: string; grant: boolean }) => {
      if (!user) throw new Error('User must be authenticated');

      const { data, error } = await supabase
        .from('user_profiles')
        .update(adminUpdate(grant))
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({
        title: variables.grant ? 'Admin access granted' : 'Request dismissed',
        description: variables.grant
          ? 'They need to sign out and back in to see the Admin dashboard.'
          : 'The user keeps their posting access.',
      });
    },
    onError: () => {
      toast({
        title: 'Could not update the request',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });
};

// Use the new admin check hook
export const useIsAdmin = useAdminCheck;
