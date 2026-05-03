import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import authService from '@/services/authService';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const GoogleAuthCallbackPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  const [message, setMessage] = useState('Completing Google sign-in...');

  useEffect(() => {
    const completeLogin = async () => {
      const params = new URLSearchParams(location.search);
      const status = params.get('status');
      const reason = params.get('reason');
      const nextPath = params.get('next') || '/';

      if (status === 'error') {
        toast({
          title: 'Google login failed',
          description:
            reason === 'oauth_failed'
              ? 'Unable to verify your Google account. Please try again.'
              : 'Authentication failed. Please try again.',
          variant: 'destructive',
        });
        navigate('/login', { replace: true });
        return;
      }

      setMessage('Verifying your account...');
      const response = await authService.completeGoogleAuth();

      if (!response.success || !response.data?.user) {
        toast({
          title: 'Session error',
          description: 'Unable to create your session. Please login again.',
          variant: 'destructive',
        });
        navigate('/login', { replace: true });
        return;
      }

      login(response.data.user);
      toast({
        title: 'Success',
        description: 'Signed in with Google',
      });

      const fallbackPath =
        response.data.user.role === 'vendor' ? '/vendor' : '/';
      const redirectPath = !response.data.user.onboardingCompleted
        ? '/onboarding'
        : nextPath.startsWith('/') ? nextPath : fallbackPath;
      navigate(redirectPath, { replace: true });
    };

    void completeLogin();
  }, [location.search, login, navigate, toast]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
          <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-gray-900">
          Signing You In
        </h1>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
};

export default GoogleAuthCallbackPage;
