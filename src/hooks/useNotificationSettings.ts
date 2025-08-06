import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type NotificationSettings = Tables<'notification_settings'>;
type NotificationSettingsUpdate = TablesUpdate<'notification_settings'>;

// Enhanced notification settings interface
export interface EnhancedNotificationSettings extends NotificationSettings {
  deadline_days_before?: number;
  deadline_time_preference?: 'morning' | 'afternoon' | 'evening';
  multiple_reminders?: boolean;
  email_frequency?: 'immediate' | 'daily' | 'weekly';
}

export const useNotificationSettings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notification-settings', user?.id],
    queryFn: async (): Promise<EnhancedNotificationSettings> => {
      if (!user) throw new Error('User must be authenticated');

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No settings found, create default settings
        const defaultSettings = {
          user_id: user.id,
          new_jobs: true,
          deadline_reminders: true,
          weekly_digest: false,
          deadline_days_before: 3,
          deadline_time_preference: 'morning' as const,
          multiple_reminders: false,
          email_frequency: 'immediate' as const
        };

        const { data: newSettings, error: createError } = await supabase
          .from('notification_settings')
          .insert([defaultSettings])
          .select()
          .single();

        if (createError) throw createError;
        return newSettings as EnhancedNotificationSettings;
      }

      if (error) throw error;
      return data as EnhancedNotificationSettings;
    },
    enabled: !!user,
  });
};

export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: Partial<EnhancedNotificationSettings>) => {
      if (!user) throw new Error('User must be authenticated');

      // Remove user_id from updates if present
      const { user_id, ...settingsUpdates } = updates;

      const { data, error } = await supabase
        .from('notification_settings')
        .update(settingsUpdates as NotificationSettingsUpdate)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as EnhancedNotificationSettings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['notification-settings', user?.id], data);
      toast({
        title: "Settings Updated",
        description: "Notification settings have been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Error updating notification settings:', error);
      toast({
        title: "Error updating settings",
        description: "There was an error updating your notification settings.",
        variant: "destructive",
      });
    },
  });
};

// Hook to get email queue statistics (admin only)
export const useEmailQueueStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['email-queue-stats'],
    queryFn: async () => {
      if (!user) throw new Error('User must be authenticated');

      const { data, error } = await supabase.rpc('get_email_queue_stats');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds for admin monitoring
  });
};

// Hook to retry failed emails (admin only)
export const useRetryFailedEmails = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (maxEmails: number = 10) => {
      const { data, error } = await supabase.rpc('retry_failed_emails', {
        max_emails: maxEmails
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (retriedCount) => {
      toast({
        title: "Emails Retried",
        description: `${retriedCount} failed emails have been queued for retry.`,
      });
    },
    onError: (error) => {
      console.error('Error retrying failed emails:', error);
      toast({
        title: "Error retrying emails",
        description: "There was an error retrying the failed emails.",
        variant: "destructive",
      });
    },
  });
};