import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DomainLoader } from '@/lib/domain-loader';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to handle automatic user approval based on email verification
 * This runs when the user's auth state changes and they have a confirmed email
 */
export const useEmailVerificationApproval = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handleEmailVerification = async () => {
      if (!user?.email || !user.email_confirmed_at) {
        return; // User not verified yet
      }

      try {
        // Check if user already processed for auto-approval
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('auto_approved_at, approval_status, is_approved_poster')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          return;
        }

        // Skip if already auto-approved or manually approved
        if (profile?.auto_approved_at || profile?.approval_status === 'approved') {
          return;
        }

        // Check if email domain is from approved university
        const isApproved = DomainLoader.isApprovedDomain(user.email);
        const universityInfo = DomainLoader.getUniversityInfo(user.email);

        if (isApproved && universityInfo) {
          console.log(`Auto-approving user from ${universityInfo.name}`);

          // Auto-approve the user
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              approval_status: 'approved',
              is_approved_poster: true,
              auto_approved_at: new Date().toISOString(),
              can_publish_directly: false, // Start with restricted posting
              approved_jobs_count: 0
            })
            .eq('id', user.id);

          if (updateError) {
            console.error('Error auto-approving user:', updateError);
            return;
          }

          // Show success message to user
          toast({
            title: "Account Automatically Approved! 🎉",
            description: `Welcome! You've been automatically approved as a job poster based on your ${universityInfo.name} email. You can now post jobs that will be reviewed before publication.`,
          });

          // Refresh the page to update the auth context
          window.location.reload();
        } else {
          console.log(`Email domain ${user.email.split('@')[1]} not in approved list`);
        }
      } catch (error) {
        console.error('Error in email verification approval:', error);
      }
    };

    // Only run if user is authenticated and email is confirmed
    if (user?.email_confirmed_at) {
      handleEmailVerification();
    }
  }, [user?.email_confirmed_at, user?.id, user?.email, toast]);
};

/**
 * Manual function to trigger auto-approval check
 * Can be used in admin panels or for testing
 */
export const triggerAutoApproval = async (userEmail: string, userId: string) => {
  const isApproved = DomainLoader.isApprovedDomain(userEmail);
  const universityInfo = DomainLoader.getUniversityInfo(userEmail);

  if (!isApproved || !universityInfo) {
    return { success: false, reason: 'Domain not in approved list' };
  }

  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        approval_status: 'approved',
        is_approved_poster: true,
        auto_approved_at: new Date().toISOString(),
        can_publish_directly: false,
        approved_jobs_count: 0
      })
      .eq('id', userId);

    if (error) {
      return { success: false, reason: error.message };
    }

    return { 
      success: true, 
      university: universityInfo.name,
      country: universityInfo.country 
    };
  } catch (error: unknown) {
    return { success: false, reason: error instanceof Error ? error.message : 'Unknown error' };
  }
};