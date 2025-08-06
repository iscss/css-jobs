import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from './useAdminCheck';

export interface AdminUserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  institution: string | null;
  orcid_id: string | null;
  google_scholar_url: string | null;
  website_url: string | null;
  user_type: string | null;
  approval_status: string | null;
  is_admin: boolean | null;
  is_approved_poster: boolean | null;
  created_at: string;
  updated_at: string;
  requested_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  auth_email: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  auth_created_at: string | null;
}

export const useAdminUserProfiles = () => {
  const { user } = useAuth();
  const { data: isAdmin } = useAdminCheck();

  return useQuery({
    queryKey: ['admin-user-profiles'],
    queryFn: async (): Promise<AdminUserProfile[]> => {
      if (!user || !isAdmin) throw new Error('User must be authenticated admin');

      const { data, error } = await supabase
        .from('admin_user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    },
    enabled: !!user && !!isAdmin,
  });
};