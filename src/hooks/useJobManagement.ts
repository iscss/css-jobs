
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

export const usePendingJobs = () => {
  const { user } = useAuth();
  const { data: isAdmin } = useAdminCheck();

  return useQuery({
    queryKey: ['pending-jobs-admin'],
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
        .eq('approval_status', 'pending')
        .order('submitted_for_approval_at', { ascending: true }); // Oldest first

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
      isPublished,
      postedBy
    }: {
      jobId: string;
      isPublished: boolean;
      postedBy?: string;
    }) => {
      if (!user) throw new Error('User must be authenticated');

      const updateData: any = { is_published: isPublished };
      
      // If retracting (setting to unpublished), change status back to draft
      if (!isPublished) {
        updateData.approval_status = 'draft';
        updateData.approved_at = null;
        updateData.approved_by_admin = null;
        updateData.job_status = 'inactive'; // Set job status to inactive when not published
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
      // If we have the job owner's ID, invalidate their cache too (for admin retracts)
      if (variables.postedBy && variables.postedBy !== user?.id) {
        queryClient.invalidateQueries({ queryKey: ['user-jobs', variables.postedBy] });
        queryClient.invalidateQueries({ queryKey: ['user-profile', variables.postedBy] });
      }

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

export const useWithdrawJob = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (jobId: string) => {
      if (!user) throw new Error('User must be authenticated');

      const { data, error } = await supabase
        .from('jobs')
        .update({
          approval_status: 'draft',
          submitted_for_approval_at: null,
          job_status: 'inactive' // Set job status to inactive when withdrawing
        })
        .eq('id', jobId)
        .eq('posted_by', user.id) // Ensure user can only withdraw their own jobs
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-jobs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['all-jobs-admin'] });
      queryClient.invalidateQueries({ queryKey: ['pending-jobs-admin'] });
      
      toast({
        title: "Job Withdrawn",
        description: "Your job has been withdrawn from the approval queue and returned to draft status.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error withdrawing job",
        description: "There was an error withdrawing the job from approval.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateJobStatus = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: isAdmin } = useAdminCheck();

  return useMutation({
    mutationFn: async ({
      jobId,
      jobStatus,
      postedBy
    }: {
      jobId: string;
      jobStatus: 'active' | 'filled' | 'inactive';
      postedBy?: string;
    }) => {
      if (!user) throw new Error('User must be authenticated');

      let query = supabase
        .from('jobs')
        .update({
          job_status: jobStatus,
          status_updated_at: new Date().toISOString(),
          status_updated_by: user.id
        })
        .eq('id', jobId);

      // Only restrict to own jobs if not admin
      if (!isAdmin) {
        query = query.eq('posted_by', user.id);
      }

      const { data, error } = await query.select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['all-jobs-admin'] });
      queryClient.invalidateQueries({ queryKey: ['user-jobs', user?.id] });

      // If admin updating another user's job, invalidate their cache too
      if (variables.postedBy && variables.postedBy !== user?.id) {
        queryClient.invalidateQueries({ queryKey: ['user-jobs', variables.postedBy] });
      }

      const statusLabels = {
        active: 'Active',
        filled: 'Filled',
        inactive: 'Inactive'
      };

      toast({
        title: `Job Status Updated`,
        description: `Job has been marked as ${statusLabels[variables.jobStatus]}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating job status",
        description: "There was an error updating the job status.",
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

export const useDeleteJobUser = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (jobId: string) => {
      if (!user) throw new Error('User must be authenticated');

      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId)
        .eq('posted_by', user.id); // Ensure user can only delete their own jobs

      if (error) throw error;
      return { jobId };
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries to update UI immediately
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['user-jobs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['all-jobs-admin'] });
      queryClient.invalidateQueries({ queryKey: ['pending-jobs-admin'] });

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
