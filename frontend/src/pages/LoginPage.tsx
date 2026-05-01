import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SocialButton from '../components/SocialButton';
import { loginSchema, type LoginFormData } from '../lib/validation';
import authService from '../services/authService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { login, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.role === 'vendor' ? '/vendor' : '/', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrPhone: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      const response = await authService.login({
        emailOrPhone: data.emailOrPhone,
        password: data.password,
      });

      if (response.success && response.data) {
        if (response.data.accessToken) {
          localStorage.setItem('accessToken', response.data.accessToken);
        }
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
        login(response.data.user);

        toast({
          title: 'Success',
          description: 'Welcome back! Redirecting...',
        });
        navigate(response.data.user.role === 'vendor' ? '/vendor' : '/');
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Invalid credentials',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'facebook') => {
    if (provider === 'google') {
      const state = location.state as { from?: string } | null;
      const nextPath = typeof state?.from === 'string' ? state.from : '/';
      authService.startGoogleAuth(nextPath);
      return;
    }

    toast({
      title: 'Info',
      description: `Social login with ${provider} coming soon`,
    });
  };

  return (
    <>
      <div className="mb-4">
        <h5 className="font-bold mb-1 text-gray-900">Log in to your account</h5>
        <p className="text-sm text-gray-500">Welcome back! Please enter your details.</p>
      </div>

      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <Link
          to="/login"
          className="pb-3 text-orange-500 font-semibold border-b-2 border-orange-500 no-underline transition-colors"
        >
          Log in
        </Link>
        <Link
          to="/register"
          className="pb-3 text-gray-400 font-medium no-underline transition-colors hover:text-orange-500"
        >
          Sign Up
        </Link>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <div className="space-y-2">
          <Label htmlFor="emailOrPhone">Email or Phone</Label>
          <Controller
            control={form.control}
            name="emailOrPhone"
            render={({ field, fieldState: { error } }) => (
              <Input
                {...field}
                id="emailOrPhone"
                type="text"
                placeholder="Enter your email or phone number"
                className={error ? 'border-red-500' : ''}
              />
            )}
          />
          {form.formState.errors.emailOrPhone && (
            <p className="text-sm text-red-500">
              {form.formState.errors.emailOrPhone.message as string}
            </p>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/forgot-password"
              className="text-sm text-orange-500 font-medium no-underline transition-colors hover:text-orange-600"
            >
              Forgot password?
            </Link>
          </div>
          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState: { error } }) => (
              <div className="relative">
                <Input
                  {...field}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className={error ? 'border-red-500 pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 bg-transparent border-none cursor-pointer p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            )}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.password.message as string}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full py-1.4 font-semibold text-base"
          style={{
            background: 'linear-gradient(to right, #f97316, #dc2626)',
            color: 'white',
            textTransform: 'none',
          }}
        >
          {isLoading ? (
            <div className="flex items-center gap-1">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Logging in...</span>
            </div>
          ) : (
            'Log in'
          )}
        </Button>
      </form>

      <div className="my-3 flex items-center">
        <div className="flex-1 border-t border-gray-200" />
        <span className="mx-2 text-xs text-gray-400">or continue with</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <SocialButton
          provider="google"
          onClick={() => handleSocialLogin('google')}
          isLoading={isLoading}
        />
        <SocialButton
          provider="facebook"
          onClick={() => handleSocialLogin('facebook')}
          isLoading={isLoading}
        />
      </div>

      <p className="text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link
          to="/register"
          className="font-semibold text-orange-500 no-underline transition-colors hover:text-orange-600"
        >
          Sign up
        </Link>
      </p>
    </>
  );
};

export default LoginPage;