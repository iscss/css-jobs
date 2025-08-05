import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type NotificationSettings = Tables<'notification_settings'>;
type NotificationSettingsUpdate = TablesUpdate<'notification_settings'>;

export const useNotificationSettings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notification-settings', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User must be authenticated');

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No settings found, create default settings
        const { data: newSettings, error: createError } = await supabase
          .from('notification_settings')
          .insert([{ user_id: user.id }])
          .select()
          .single();

        if (createError) throw createError;
        return newSettings;
      }

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: NotificationSettingsUpdate) => {
      if (!user) throw new Error('User must be authenticated');

      const { data, error } = await supabase
        .from('notification_settings')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings', user?.id] });
      toast({
        title: "Settings Updated",
        description: "Notification settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating settings",
        description: "There was an error updating your notification settings.",
        variant: "destructive",
      });
    },
  });
};