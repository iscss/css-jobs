import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type SavedJob = Tables<'saved_jobs'>;

export const useSavedJobs = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['saved-jobs', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User must be authenticated');

      const { data, error } = await supabase
        .from('saved_jobs')
        .select(`
          *,
          jobs (
            *,
            job_tags (
              id,
              tag
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useSaveJob = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (jobId: string) => {
      if (!user) throw new Error('User must be authenticated');

      const { data, error } = await supabase
        .from('saved_jobs')
        .insert([{ user_id: user.id, job_id: jobId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['saved-jobs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['check-saved-job', user?.id, jobId] });
      toast({
        title: "Job Saved",
        description: "Job has been added to your saved list.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving job",
        description: "There was an error saving the job.",
        variant: "destructive",
      });
    },
  });
};

export const useUnsaveJob = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (jobId: string) => {
      if (!user) throw new Error('User must be authenticated');

      const { error } = await supabase
        .from('saved_jobs')
        .delete()
        .eq('user_id', user.id)
        .eq('job_id', jobId);

      if (error) throw error;
    },
    onSuccess: (data, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['saved-jobs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['check-saved-job', user?.id, jobId] });
      toast({
        title: "Job Removed",
        description: "Job has been removed from your saved list.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error removing job",
        description: "There was an error removing the job.",
        variant: "destructive",
      });
    },
  });
};

export const useCheckSavedJob = (jobId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['check-saved-job', user?.id, jobId],
    queryFn: async () => {
      if (!user || !jobId) return false;

      const { data, error } = await supabase
        .from('saved_jobs')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('job_id', jobId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!jobId,
  });
};