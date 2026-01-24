import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import SocialButton from '../components/SocialButton';
import { loginSchema, type LoginFormData } from '../lib/validation';

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      const isSuccess = Math.random() > 0.1; // 90% success rate

      if (isSuccess) {
        console.log('Login data:', data); // Using the data parameter to prevent the warning
        toast.success('Welcome! Redirecting...');
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        toast.error('Invalid credentials');
      }

      setIsLoading(false);
    }, 1500);
  };

  const handleForgotPassword = () => {
    toast.info('Password reset coming soon');
  };

  const handleSocialLogin = (provider: 'google' | 'facebook') => {
    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => {
          toast.info(`Social login with ${provider} coming soon`);
          resolve(null);
        }, 1500);
      }),
      {
        pending: `Logging in with ${provider}...`,
        success: 'Login successful!',
        error: 'Login failed'
      }
    );
  };

  return (
    <AuthLayout isLogin={true}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Log in to your account</h2>
        <p className="text-gray-600">Welcome back! Please enter your details.</p>
      </div>

      <div className="flex space-x-4 mb-6 border-b">
        <Link 
          to="/login" 
          className="pb-2 text-orange-500 font-semibold border-b-2 border-orange-500"
        >
          Log in
        </Link>
        <Link 
          to="/register" 
          className="pb-2 text-gray-500 hover:text-orange-500 font-medium"
        >
          Sign Up
        </Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className={`w-full px-3 py-2 border ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            } rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
            placeholder="Enter your email"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-orange-500 hover:text-orange-600 font-medium"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              className={`w-full px-3 py-2 pr-10 border ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-500" />
              ) : (
                <Eye className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 px-4 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold shadow-md hover:from-orange-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200 ${
            isLoading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Logging in...
            </span>
          ) : (
            'Log in'
          )}
        </button>
      </form>

      <div className="my-6 flex items-center">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="mx-4 text-sm text-gray-500">or continue with</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
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
        <Link to="/register" className="font-medium text-orange-500 hover:text-orange-600">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
};

export default LoginPage;