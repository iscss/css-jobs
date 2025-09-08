import { useQueryClient } from '@tanstack/react-query';

export const usePageRefresh = () => {
  const queryClient = useQueryClient();

  const refreshPageData = (page: string) => {
    switch (page) {
      case '/':
      case '/home':
        // Home page uses jobs data
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        break;
        
      case '/jobs':
        // Browse Jobs page uses jobs and related filters data
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        queryClient.invalidateQueries({ queryKey: ['job-filters'] });
        queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
        break;
        
      case '/post-job':
        // Post Job page might need user profile and approval domain data
        queryClient.invalidateQueries({ queryKey: ['user-profile'] });
        queryClient.invalidateQueries({ queryKey: ['approved-domains'] });
        break;
        
      case '/profile':
        // Profile page uses user data, jobs, saved jobs, etc.
        queryClient.invalidateQueries({ queryKey: ['user-profile'] });
        queryClient.invalidateQueries({ queryKey: ['user-jobs'] });
        queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
        queryClient.invalidateQueries({ queryKey: ['job-alerts'] });
        queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
        break;
        
      case '/admin':
        // Admin page uses all admin-related data
        queryClient.invalidateQueries({ queryKey: ['admin-approvals'] });
        queryClient.invalidateQueries({ queryKey: ['pending-jobs-admin'] });
        queryClient.invalidateQueries({ queryKey: ['all-jobs-admin'] });
        queryClient.invalidateQueries({ queryKey: ['admin-user-profiles'] });
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        queryClient.invalidateQueries({ queryKey: ['user-jobs-admin'] });
        break;
        
      default:
        // For any other page, refresh common data
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    }
  };

  return { refreshPageData };
};