
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAdminCheck } from './useAdminCheck';

// The API returns at most 1,000 rows per request. Narrowing by status in the
// query (not just in the browser) keeps a large view, such as hundreds of
// rejected jobs, from pushing the rest past that cap.
export type JobListStatus =
  | 'all'
  | 'published'
  | 'pending'
  | 'rejected'
  | 'draft'
  | 'closed';

export const useAllJobs = (status: JobListStatus = 'all') => {
  const { user } = useAuth();
  const { data: isAdmin } = useAdminCheck();

  return useQuery({
    // Shares the 'all-jobs-admin' prefix, so every existing invalidation
    // refreshes this list too.
    queryKey: ['all-jobs-admin', 'list', status],
    queryFn: async () => {
      if (!user || !isAdmin) throw new Error('User must be authenticated admin');

      let query = supabase
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

      switch (status) {
        case 'published':
          query = query.eq('is_published', true);
          break;
        case 'pending':
        case 'rejected':
          query = query.eq('approval_status', status);
          break;
        case 'draft':
          query = query.or('approval_status.eq.draft,approval_status.is.null');
          break;
        case 'closed':
          query = query.eq('job_status', 'filled');
          break;
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!isAdmin,
  });
};

// Bulk approve / reject. Runs as set-based updates (admins may update any job
// under the existing RLS policy), in chunks so the id list stays a reasonable
// size. Each update also repeats the "not already in that state" check, so a
// job someone else changed in the meantime is left alone and not counted.
export const useBulkJobAction = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: 'approve' | 'reject' }) => {
      if (!user) throw new Error('User must be authenticated');

      const now = new Date().toISOString();
      let changed = 0;

      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        const base = supabase.from('jobs');

        const query =
          action === 'approve'
            ? base
                .update({
                  approval_status: 'approved',
                  is_published: true,
                  approved_at: now,
                  approved_by_admin: user.id,
                })
                .in('id', chunk)
                .neq('approval_status', 'approved')
                .neq('job_status', 'filled')
            : base
                .update({
                  approval_status: 'rejected',
                  is_published: false,
                  approved_by_admin: user.id,
                })
                .in('id', chunk)
                .neq('approval_status', 'rejected');

        const { data, error } = await query.select('id');
        if (error) throw error;
        changed += data?.length ?? 0;
      }
      return { changed, action };
    },
    onSuccess: ({ changed, action }) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['all-jobs-admin'] });
      queryClient.invalidateQueries({ queryKey: ['pending-jobs-admin'] });
      toast({
        title: action === 'approve' ? 'Jobs approved' : 'Jobs rejected',
        description:
          action === 'approve'
            ? `${changed} job${changed === 1 ? '' : 's'} approved and published.`
            : `${changed} job${changed === 1 ? '' : 's'} rejected.`,
      });
    },
    onError: (error: unknown) => {
      console.error('Bulk action failed:', error);
      toast({
        title: 'Bulk action failed',
        description: 'Some jobs may not have been updated. Refresh and check before trying again.',
        variant: 'destructive',
      });
    },
  });
};

// Exact job counts for the admin dashboard. The job list above is capped at
// 1,000 rows by the API, so counting it in the browser undercounts as soon as
// the table grows. The key shares the 'all-jobs-admin' prefix, so every
// mutation that refreshes the list refreshes these too.
export const useJobCounts = () => {
  const { user } = useAuth();
  const { data: isAdmin } = useAdminCheck();

  return useQuery({
    queryKey: ['all-jobs-admin', 'counts'],
    queryFn: async () => {
      if (!user || !isAdmin) throw new Error('User must be authenticated admin');

      const count = async (apply?: (q: any) => any) => {
        let query = supabase.from('jobs').select('id', { count: 'exact', head: true });
        if (apply) query = apply(query);
        const { count: n, error } = await query;
        if (error) throw error;
        return n ?? 0;
      };

      const [total, published, pending, rejected, featured] = await Promise.all([
        count(),
        count((q) => q.eq('is_published', true)),
        count((q) => q.eq('approval_status', 'pending')),
        count((q) => q.eq('approval_status', 'rejected')),
        count((q) => q.eq('is_featured', true)),
      ]);
      return { total, published, pending, rejected, featured };
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
        // Human submissions first (they are never auto-imported), then the
        // most likely CSS imports, newest first within the same score. Nothing
        // is filtered out - the long tail of low-scoring imports stays in the
        // queue, just further down.
        .order('is_auto_imported', { ascending: true })
        .order('relevance_score', { ascending: false, nullsFirst: false })
        .order('posted_at', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: true }); // Oldest submissions first

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

      const updateData: Record<string, unknown> = { is_published: isPublished };

      // If retracting (setting to unpublished), change status back to draft
      if (!isPublished) {
        updateData.approval_status = 'draft';
        updateData.approved_at = null;
        updateData.approved_by_admin = null;
      } else {
        // If publishing, set approval status to approved
        updateData.approval_status = 'approved';
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by_admin = user.id;
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
          approval_status: 'draft'
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
      jobStatus: 'filled';  // Only support marking as filled for now
      postedBy?: string;
    }) => {
      if (!user) throw new Error('User must be authenticated');

      // Mark job as unpublished when filled
      let query = supabase
        .from('jobs')
        .update({
          is_published: false,
          updated_at: new Date().toISOString()
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
