
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type UserProfile = Tables<'user_profiles'>;

export const useAdminApprovals = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-approvals'],
    queryFn: async () => {
      if (!user) throw new Error('User must be authenticated');

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('approval_status', 'pending')
        .order('requested_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useUpdateApprovalStatus = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      status, 
      userType 
    }: { 
      userId: string; 
      status: 'approved' | 'rejected';
      userType: string;
    }) => {
      if (!user) throw new Error('User must be authenticated');

      const updateData: any = {
        approval_status: status,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      };

      // If approving a job poster or both, set is_approved_poster to true
      if (status === 'approved' && (userType === 'job_poster' || userType === 'both')) {
        updateData.is_approved_poster = true;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-approvals'] });
      toast({
        title: `User ${variables.status === 'approved' ? 'Approved' : 'Rejected'}`,
        description: `The user has been successfully ${variables.status}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating approval status",
        description: "There was an error updating the user's approval status.",
        variant: "destructive",
      });
    },
  });
};

export const useIsAdmin = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (error) return false;
      return data.is_admin || false;
    },
    enabled: !!user,
  });
};
