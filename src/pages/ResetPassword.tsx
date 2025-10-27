import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Check, X, AlertCircle } from 'lucide-react';
import Header from '@/components/layout/Header';

// Password requirement checker component (reused from Auth.tsx)
const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
  <div className={`flex items-center gap-2 text-sm ${met ? 'text-green-600' : 'text-gray-500'}`}>
    {met ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
    <span>{text}</span>
  </div>
);

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasValidToken, setHasValidToken] = useState(false);
  const { resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Password validation checks
  const passwordChecks = {
    minLength: password.length >= 12,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  useEffect(() => {
    // Check if we have the necessary token/hash parameters for password reset
    // Supabase sends the reset token as a hash fragment
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    const refreshToken = hashParams.get('refresh_token');

    if (type === 'recovery' && accessToken) {
      // Token is present in URL, Supabase will handle session automatically
      setHasValidToken(true);
    } else if (searchParams.get('error')) {
      // Handle error from Supabase (e.g., expired token)
      const errorDescription = searchParams.get('error_description') || 'Invalid or expired reset link';
      toast({
        title: "Reset link invalid",
        description: errorDescription,
        variant: "destructive",
      });
      setTimeout(() => navigate('/forgot-password'), 3000);
    } else if (user) {
      // User has an active recovery session (Supabase has already exchanged the token)
      setHasValidToken(true);
    } else {
      // No valid token and no user session - wait a bit for Supabase to process
      const timer = setTimeout(() => {
        if (!user) {
          toast({
            title: "No reset token found",
            description: "Please request a new password reset link.",
            variant: "destructive",
          });
          navigate('/forgot-password');
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [searchParams, navigate, toast, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      toast({
        title: "Weak password",
        description: "Please ensure your password meets all security requirements.",
        variant: "destructive",
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await resetPassword(password);

      if (error) {
        const errorMessage = (error as { message?: string }).message || 'An error occurred';

        toast({
          title: "Password reset failed",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password reset successful!",
          description: "Your password has been updated. Redirecting to sign in...",
        });

        // Sign out the recovery session and redirect to sign in page
        setTimeout(async () => {
          await supabase.auth.signOut({ scope: 'local' });
          navigate('/auth');
        }, 2000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!hasValidToken) {
    return (
      <div className="page-wrapper">
        <Header />
        <div className="main-content flex items-center justify-center px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <div className="flex justify-center mb-4">
                <AlertCircle className="w-16 h-16 text-yellow-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-center">
                Verifying Reset Link...
              </CardTitle>
              <CardDescription className="text-center">
                Please wait while we verify your password reset link.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Header />
      <div className="main-content flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Set New Password
            </CardTitle>
            <CardDescription className="text-center">
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={12}
                  autoFocus
                />
                {password.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md space-y-2">
                    <p className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</p>
                    <PasswordRequirement met={passwordChecks.minLength} text="At least 12 characters" />
                    <PasswordRequirement met={passwordChecks.hasUppercase} text="One uppercase letter" />
                    <PasswordRequirement met={passwordChecks.hasLowercase} text="One lowercase letter" />
                    <PasswordRequirement met={passwordChecks.hasNumber} text="One number" />
                    <PasswordRequirement met={passwordChecks.hasSpecial} text="One special character (!@#$%^&*)" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={12}
                />
                {confirmPassword.length > 0 && (
                  <div className="flex items-center gap-2 text-sm mt-2">
                    {passwordsMatch ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Passwords match
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1">
                        <X className="w-4 h-4" />
                        Passwords don't match
                      </span>
                    )}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !isPasswordValid || !passwordsMatch}
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
