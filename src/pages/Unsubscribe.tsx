import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No unsubscribe token provided.');
      return;
    }

    const unsubscribe = async () => {
      const { data, error } = await supabase.rpc('handle_unsubscribe', { token });

      if (error) {
        setStatus('error');
        setMessage('Something went wrong. Please try again later.');
        return;
      }

      if (data === false) {
        setStatus('error');
        setMessage('This unsubscribe link is not valid.');
        return;
      }

      setStatus('success');
      setMessage('You have been successfully unsubscribed from CSS Jobs emails.');
    };

    unsubscribe();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-brand-surface flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          {status === 'loading' && (
            <>
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Processing...
              </CardTitle>
              <CardDescription className="text-base text-gray-600">
                Please wait while we process your request.
              </CardDescription>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Unsubscribed
              </CardTitle>
              <CardDescription className="text-base text-gray-600">
                {message}
              </CardDescription>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Error
              </CardTitle>
              <CardDescription className="text-base text-gray-600">
                {message}
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="text-center">
          <a href="/" className="text-sm text-gray-600 hover:text-gray-900 underline">
            Go to CSS Jobs
          </a>
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
