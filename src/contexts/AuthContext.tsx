
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { authRateLimiter, signupRateLimiter } from '@/lib/rate-limit';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: unknown }>;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: unknown }>;
  resetPassword: (newPassword: string) => Promise<{ error: unknown }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.error('Session fetch error:', error);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    // Rate limiting check
    const rateLimitCheck = signupRateLimiter.check(email.toLowerCase());
    if (!rateLimitCheck.isAllowed) {
      return {
        error: {
          message: rateLimitCheck.message || 'Too many signup attempts',
          status: 429,
        }
      };
    }

    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: fullName ? { full_name: fullName } : undefined
      }
    });

    // Reset rate limit on successful signup
    if (!error) {
      signupRateLimiter.reset(email.toLowerCase());
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // Rate limiting check
    const rateLimitCheck = authRateLimiter.check(email.toLowerCase());
    if (!rateLimitCheck.isAllowed) {
      return {
        error: {
          message: rateLimitCheck.message || 'Too many login attempts',
          status: 429,
        }
      };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    // Reset rate limit on successful sign in
    if (!error) {
      authRateLimiter.reset(email.toLowerCase());
    }

    return { error };
  };

  const signOut = async () => {
    try {
      // Use local scope to only sign out the current session
      // This prevents 403 errors that can occur with global scope
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Error during signOut:', error);
      // If signOut fails, we can still clear the local session state
      setUser(null);
      setSession(null);
    }
  };

  const requestPasswordReset = async (email: string) => {
    // Rate limiting check
    const rateLimitCheck = authRateLimiter.check(email.toLowerCase());
    if (!rateLimitCheck.isAllowed) {
      return {
        error: {
          message: rateLimitCheck.message || 'Too many password reset attempts',
          status: 429,
        }
      };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    // Don't reset rate limit on success for security (don't reveal if email exists)
    return { error };
  };

  const resetPassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    return { error };
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    requestPasswordReset,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
