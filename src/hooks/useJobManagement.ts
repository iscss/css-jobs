
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
          ),
          user_profiles!jobs_posted_by_fkey (
            id,
            full_name,
            email
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

      const updateData: any = { is_published: isPublished };
      
      // If retracting (setting to unpublished), change status back to draft
      if (!isPublished) {
        updateData.approval_status = 'draft';
        updateData.approved_at = null;
        updateData.approved_by_admin = null;
      }

      const { data, error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all relevant queries to update UI immediately
      queryClient.invalidateQueries({ queryKey: ['all-jobs-admin'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['user-jobs', user?.id] });

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
      // Invalidate all relevant queries to update UI immediately
      queryClient.invalidateQueries({ queryKey: ['all-jobs-admin'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['user-jobs', user?.id] });

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

export const useDeleteJob = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: isAdmin } = useAdminCheck();

  return useMutation({
    mutationFn: async (jobId: string) => {
      if (!user) throw new Error('User must be authenticated');
      if (!isAdmin) throw new Error('Admin privileges required');

      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;
      return { jobId };
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries to update UI immediately
      queryClient.invalidateQueries({ queryKey: ['all-jobs-admin'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['user-jobs', user?.id] });

      toast({
        title: "Job Deleted",
        description: "The job post has been permanently deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting job",
        description: "There was an error deleting the job post.",
        variant: "destructive",
      });
    },
  });
};
