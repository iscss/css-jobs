import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type JobAlert = Tables<'job_alerts'>;
type JobAlertInsert = TablesInsert<'job_alerts'>;

export const useJobAlerts = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['job-alerts', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User must be authenticated');

      const { data, error } = await supabase
        .from('job_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreateJobAlert = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (alertData: Omit<JobAlertInsert, 'user_id'>) => {
      if (!user) throw new Error('User must be authenticated');

      const { data, error } = await supabase
        .from('job_alerts')
        .insert([{ ...alertData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-alerts', user?.id] });
      toast({
        title: "Alert Created",
        description: "Job alert has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating alert",
        description: "There was an error creating the job alert.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteJobAlert = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (alertId: string) => {
      if (!user) throw new Error('User must be authenticated');

      const { error } = await supabase
        .from('job_alerts')
        .delete()
        .eq('id', alertId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-alerts', user?.id] });
      toast({
        title: "Alert Deleted",
        description: "Job alert has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting alert",
        description: "There was an error deleting the job alert.",
        variant: "destructive",
      });
    },
  });
};