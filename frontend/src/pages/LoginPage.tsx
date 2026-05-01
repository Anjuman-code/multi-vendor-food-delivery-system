import {
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SocialButton from '../components/SocialButton';
import { loginSchema, type LoginFormData } from '../lib/validation';
import authService from '../services/authService';

/**
 * LoginPage - User login page.
 *
 * This page is wrapped by AuthLayout which provides:
 * - Split-screen layout with branding
 * - Logo and footer
 */
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
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
          Log in to your account
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Welcome back! Please enter your details.
        </Typography>
      </Box>

      {/* Tabs */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 4,
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <Link
          to="/login"
          style={{
            paddingBottom: '12px',
            color: '#f97316',
            fontWeight: 600,
            borderBottom: '2px solid #f97316',
            textDecoration: 'none',
            transition: 'color 0.3s',
          }}
        >
          Log in
        </Link>
        <Link
          to="/register"
          style={{
            paddingBottom: '12px',
            color: '#9ca3af',
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'color 0.3s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#f97316')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
        >
          Sign Up
        </Link>
      </Box>

      {/* Form */}
      <Box
        component="form"
        onSubmit={form.handleSubmit(onSubmit)}
        sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
      >
        {/* Email or Phone Field */}
        <Controller
          control={form.control}
          name="emailOrPhone"
          render={({ field, fieldState: { error } }) => (
            <TextField
              {...field}
              fullWidth
              type="text"
              label="Email or Phone"
              placeholder="Enter your email or phone number"
              error={!!error}
              helperText={error?.message}
              variant="outlined"
              size="medium"
            />
          )}
        />

        {/* Password Field */}
        <Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: '#374151' }}
            >
              Password
            </Typography>
            <Link
              to="/forgot-password"
              style={{
                fontSize: '14px',
                color: '#f97316',
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'color 0.3s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ea580c')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#f97316')}
            >
              Forgot password?
            </Link>
          </Box>
          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                fullWidth
                type={showPassword ? 'text' : 'password'}
                label="Password"
                placeholder="Enter your password"
                error={!!error}
                helperText={error?.message}
                variant="outlined"
                size="medium"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                        sx={{ color: '#6b7280' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />
        </Box>

        {/* Submit Button */}
        <Button
          type="submit"
          fullWidth
          disabled={isLoading}
          variant="contained"
          sx={{
            background: 'linear-gradient(to right, #f97316, #dc2626)',
            color: 'white',
            fontWeight: 600,
            py: 1.4,
            fontSize: '1rem',
            textTransform: 'none',
            '&:hover': {
              background: 'linear-gradient(to right, #ea580c, #b91c1c)',
            },
            '&:disabled': {
              background: '#d1d5db',
              color: 'white',
            },
            transition: 'all 0.2s',
          }}
        >
          {isLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} sx={{ color: 'white' }} />
              <span>Logging in...</span>
            </Box>
          ) : (
            'Log in'
          )}
        </Button>
      </Box>

      {/* Divider */}
      <Box
        sx={{
          my: 3,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Box sx={{ flex: 1, borderTop: '1px solid #e5e7eb' }} />
        <Typography
          variant="caption"
          sx={{ mx: 2, color: '#9ca3af' }}
        >
          or continue with
        </Typography>
        <Box sx={{ flex: 1, borderTop: '1px solid #e5e7eb' }} />
      </Box>

      {/* Social Buttons */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 3 }}>
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
      </Box>

      {/* Footer */}
      <Typography
        variant="body2"
        sx={{
          textAlign: 'center',
          color: '#4b5563',
        }}
      >
        Don't have an account?{' '}
        <Link
          to="/register"
          style={{
            fontWeight: 600,
            color: '#f97316',
            textDecoration: 'none',
            transition: 'color 0.3s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ea580c')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#f97316')}
        >
          Sign up
        </Link>
      </Typography>
    </>
  );
};

export default LoginPage;