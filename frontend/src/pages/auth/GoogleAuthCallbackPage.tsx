import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';
import authService from '@/services/authService';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const GoogleAuthCallbackPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [message, setMessage] = useState('Completing Google sign-in...');

  useEffect(() => {
    const completeLogin = async () => {
      const params = new URLSearchParams(location.search);
      const status = params.get('status');
      const reason = params.get('reason');
      const nextPath = params.get('next') || '/';

      if (status === 'error') {
        toast.error('Google login failed', {
          description:
            reason === 'oauth_failed'
              ? 'Unable to verify your Google account. Please try again.'
              : 'Authentication failed. Please try again.',
        });
        navigate('/login', { replace: true });
        return;
      }

      setMessage('Verifying your account...');
      const response = await authService.completeGoogleAuth();

      if (!response.success || !response.data?.user) {
        toast.error('Session error', {
          description: 'Unable to create your session. Please login again.',
        });
        navigate('/login', { replace: true });
        return;
      }

      login(response.data.user);
      toast.success('Success', {
        description: 'Signed in with Google',
      });

      const fallbackPath =
        response.data.user.role === 'vendor' ? '/vendor' : response.data.user.role === 'admin' ? '/admin' : response.data.user.role === 'driver' ? '/rider' : '/';
      const redirectPath = !response.data.user.onboardingCompleted
        ? '/onboarding'
        : nextPath.startsWith('/') ? nextPath : fallbackPath;
      navigate(redirectPath, { replace: true });
    };

    void completeLogin();
  }, [location.search, login, navigate]);

  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
        Signing you in
      </h1>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
};

export default GoogleAuthCallbackPage;
