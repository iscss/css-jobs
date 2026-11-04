import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight } from 'lucide-react';

const EmailVerified = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-brand-surface flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Email Verified Successfully!
          </CardTitle>
          <CardDescription className="text-base text-gray-600">
            Your email has been verified. You can now sign in to access all features of CSS Jobs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-brand-surface border border-brand-surface-2 rounded-lg p-4">
            <h3 className="font-semibold text-brand-navy mb-2">What's next?</h3>
            <ul className="space-y-2 text-sm text-brand-navy">
              <li className="flex items-start gap-2">
                <span className="text-brand-navy mt-0.5">•</span>
                <span>Sign in with your credentials</span>
              </li>
            </ul>
          </div>

          <Button
            onClick={() => navigate('/auth?tab=signin')}
            className="w-full bg-brand-navy hover:bg-brand-navy/90"
            size="lg"
          >
            Sign In Now
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>

          <div className="text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Go to Home Page
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailVerified;
