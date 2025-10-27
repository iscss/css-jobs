import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { sanitizeEmail } from '@/lib/sanitize';
import { ArrowLeft, Mail } from 'lucide-react';
import Header from '@/components/layout/Header';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { requestPasswordReset } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const sanitizedEmail = sanitizeEmail(email);
      const { error } = await requestPasswordReset(sanitizedEmail);

      if (error) {
        const errorMessage = (error as { message?: string }).message || 'An error occurred';

        if (errorMessage.includes('Too many')) {
          toast({
            title: "Too many attempts",
            description: errorMessage,
            variant: "destructive",
          });
        } else {
          // For security, show success message even if email doesn't exist
          // This prevents email enumeration attacks
          setEmailSent(true);
        }
      } else {
        setEmailSent(true);
      }
    } catch (error) {
      // For security, show success message even on error
      setEmailSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="page-wrapper">
        <Header />
        <div className="main-content flex items-center justify-center px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <div className="flex justify-center mb-4">
                <Mail className="w-16 h-16 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-center">
                Check Your Email
              </CardTitle>
              <CardDescription className="text-center">
                If an account exists with that email address, we've sent you a password reset link.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>What to do next:</strong>
                </p>
                <ul className="mt-2 text-sm text-blue-800 list-disc list-inside space-y-1">
                  <li>Check your email inbox (including spam/junk folders)</li>
                  <li>Click the password reset link in the email</li>
                  <li>The link will expire in 1 hour for security</li>
                </ul>
              </div>
              <div className="text-center">
                <Link to="/auth">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Sign In
                  </Button>
                </Link>
              </div>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Try a different email address
                </button>
              </div>
            </CardContent>
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
              Reset Your Password
            </CardTitle>
            <CardDescription className="text-center">
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <Link to="/auth">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline inline-flex items-center"
                >
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Back to Sign In
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
