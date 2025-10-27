import React from 'react';
import { useEmailVerificationApproval } from '@/hooks/useEmailVerificationApproval';

/**
 * Component that handles email verification auto-approval
 * Must be rendered inside AuthProvider to access user context
 */
export const EmailVerificationHandler: React.FC = () => {
  useEmailVerificationApproval();
  return null; // This component doesn't render anything
};

export default EmailVerificationHandler;