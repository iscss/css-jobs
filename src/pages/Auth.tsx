import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserCheck, Briefcase, Users, Globe, GraduationCap } from 'lucide-react';
import Header from '@/components/layout/Header';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [googleScholarUrl, setGoogleScholarUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [userType, setUserType] = useState('job_seeker');
  const [loading, setLoading] = useState(false);
  const { signUp, signIn, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let error;
      if (isSignUp) {
        // Check if email already exists
        const { data: existingUser } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('email', email)
          .single();

        if (existingUser) {
          toast({
            title: "Email already registered",
            description: "An account with this email already exists. Please sign in instead.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Pass all user data in signup metadata so the trigger can handle it properly
        ({ error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              user_type: userType,
              google_scholar_url: googleScholarUrl || null,
              website_url: websiteUrl || null
            }
          }
        }));
        
        if (!error) {

          toast({
            title: "Account created successfully!",
            description: userType === 'job_seeker'
              ? "Welcome! Please check your email to verify your account, then you can browse and save job positions."
              : "Your account has been created. Please verify your email and wait for admin approval for job posting privileges.",
          });

          // Redirect user after successful signup
          setTimeout(() => {
            navigate('/');
          }, 2000);
        }
      } else {
        ({ error } = await signIn(email, password));
        if (!error) {
          toast({
            title: "Welcome back!",
            description: "You have successfully signed in.",
          });
        }
      }

      if (error) {
        const errorMessage = error.message;
        if (errorMessage.includes('Invalid login credentials')) {
          toast({
            title: "Invalid credentials",
            description: "Please check your email and password and try again.",
            variant: "destructive",
          });
        } else if (errorMessage.includes('Email not confirmed')) {
          toast({
            title: "Email not verified",
            description: "Please check your email and click the verification link before signing in.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
        }
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

  return (
    <div className="page-wrapper">
      <Header />
      <div className="main-content flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </CardTitle>
            <CardDescription className="text-center">
              {isSignUp
                ? 'Join the CSS Jobs community'
                : 'Welcome back to CSS Jobs'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="googleScholarUrl" className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      Google Scholar Profile (Optional)
                    </Label>
                    <Input
                      id="googleScholarUrl"
                      type="url"
                      placeholder="https://scholar.google.com/citations?user=..."
                      value={googleScholarUrl}
                      onChange={(e) => setGoogleScholarUrl(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="websiteUrl" className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Personal Website (Optional)
                    </Label>
                    <Input
                      id="websiteUrl"
                      type="url"
                      placeholder="https://yourwebsite.com"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>I am here to:</Label>
                    <RadioGroup value={userType} onValueChange={setUserType}>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value="job_seeker" id="job_seeker" />
                        <Label htmlFor="job_seeker" className="flex items-center gap-2 cursor-pointer flex-1">
                          <UserCheck className="w-4 h-4 text-blue-600" />
                          <div>
                            <div className="font-medium">Look for jobs</div>
                            <div className="text-sm text-gray-500">Browse and apply to research positions</div>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value="job_poster" id="job_poster" />
                        <Label htmlFor="job_poster" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Briefcase className="w-4 h-4 text-green-600" />
                          <div>
                            <div className="font-medium">Post jobs</div>
                            <div className="text-sm text-gray-500">Requires admin approval</div>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value="both" id="both" />
                        <Label htmlFor="both" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Users className="w-4 h-4 text-purple-600" />
                          <div>
                            <div className="font-medium">Both</div>
                            <div className="text-sm text-gray-500">Look for and post jobs (requires approval)</div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-primary hover:underline"
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"
                }
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
