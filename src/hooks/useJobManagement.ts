
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAdminCheck } from './useAdminCheck';

export const useAllJobs = () => {
  const { user } = useAuth();
  const { data: isAdmin } = useAdminCheck();

  return useQuery({
    queryKey: ['all-jobs-admin'],
    queryFn: async () => {
      if (!user || !isAdmin) throw new Error('User must be authenticated admin');

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          job_tags (
            id,
            tag
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!isAdmin,
  });
};

export const useRetractJob = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      jobId, 
      isPublished 
    }: { 
      jobId: string; 
      isPublished: boolean;
    }) => {
      if (!user) throw new Error('User must be authenticated');

      const { data, error } = await supabase
        .from('jobs')
        .update({ is_published: isPublished })
        .eq('id', jobId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['all-jobs-admin'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      
      toast({
        title: `Job ${variables.isPublished ? 'Published' : 'Retracted'}`,
        description: `The job post has been successfully ${variables.isPublished ? 'published' : 'retracted'}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating job status",
        description: "There was an error updating the job's publication status.",
        variant: "destructive",
      });
    },
  });
};

export const useToggleFeatured = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      jobId, 
      isFeatured 
    }: { 
      jobId: string; 
      isFeatured: boolean;
    }) => {
      if (!user) throw new Error('User must be authenticated');

      const { data, error } = await supabase
        .from('jobs')
        .update({ is_featured: isFeatured })
        .eq('id', jobId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['all-jobs-admin'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      
      toast({
        title: `Job ${variables.isFeatured ? 'Featured' : 'Unfeatured'}`,
        description: `The job post has been ${variables.isFeatured ? 'marked as featured' : 'removed from featured'}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating featured status",
        description: "There was an error updating the job's featured status.",
        variant: "destructive",
      });
    },
  });
};
