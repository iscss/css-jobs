
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type Job = Tables<'jobs'>;
type JobInsert = TablesInsert<'jobs'>;

export const useJobs = () => {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          job_tags (
            id,
            tag
          )
        `)
        .eq('is_published', true)
        .eq('approval_status', 'approved')  // Required for public access by RLS policy
        .eq('job_status', 'active')  // Only show active jobs to public
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useCreateJob = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (jobData: Omit<JobInsert, 'posted_by'> & { tags?: string[] }) => {
      if (!user) throw new Error('User must be authenticated');

      const { tags, ...job } = jobData;
      
      const { data, error } = await supabase
        .from('jobs')
        .insert([{ ...job, posted_by: user.id }])
        .select()
        .single();

      if (error) throw error;

      // Add tags if provided
      if (tags && tags.length > 0) {
        const tagInserts = tags.map(tag => ({
          job_id: data.id,
          tag: tag.trim()
        }));

        const { error: tagError } = await supabase
          .from('job_tags')
          .insert(tagInserts);

        if (tagError) throw tagError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['all-jobs-admin'] });
      queryClient.invalidateQueries({ queryKey: ['user-jobs'] });
      // Also invalidate admin view of user jobs for all users
      queryClient.invalidateQueries({ queryKey: ['user-jobs-admin'] });
    },
  });
};

export const useUserJobs = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-jobs', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User must be authenticated');

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          job_tags (
            id,
            tag
          )
        `)
        .eq('posted_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useUserJobsAdmin = (userId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-jobs-admin', userId],
    queryFn: async () => {
      if (!user) throw new Error('User must be authenticated');

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          approval_status,
          is_published,
          created_at,
          job_type,
          job_status
        `)
        .eq('posted_by', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!userId,
  });
};
