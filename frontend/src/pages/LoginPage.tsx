import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import SocialButton from "../components/SocialButton";
import { loginSchema, type LoginFormData } from "../lib/validation";
import authService from "../services/authService";

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
  const { toast } = useToast();
  const { login, isAuthenticated } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrPhone: "",
      password: "",
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
        // Update auth context with user data
        login(response.data.user);

        toast({
          title: "Success",
          description: "Welcome back! Redirecting...",
        });
        navigate("/");
      } else {
        toast({
          title: "Error",
          description: response.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: "google" | "facebook") => {
    toast({
      title: "Info",
      description: `Social login with ${provider} coming soon`,
    });
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Log in to your account
        </h2>
        <p className="text-gray-600">
          Welcome back! Please enter your details.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-8 border-b border-gray-200">
        <Link
          to="/login"
          className="pb-3 text-orange-500 font-semibold border-b-2 border-orange-500 transition-colors"
        >
          Log in
        </Link>
        <Link
          to="/register"
          className="pb-3 text-gray-500 hover:text-orange-500 font-medium transition-colors"
        >
          Sign Up
        </Link>
      </div>

      {/* Login Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="emailOrPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email or Phone</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Enter your email or phone number"
                    {...field}
                    className={
                      form.formState.errors.emailOrPhone
                        ? "border-red-500 focus:ring-red-500"
                        : ""
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-gray-700"
              >
                Password
              </Label>
              <Link
                to="/forgot-password"
                className="text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className={`${form.formState.errors.password ? "border-red-500 focus:ring-red-500" : ""} pr-10`}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold shadow-md hover:from-orange-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200 h-11"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Logging in...
              </span>
            ) : (
              "Log in"
            )}
          </Button>
        </form>
      </Form>

      {/* Divider */}
      <div className="my-6 flex items-center">
        <div className="flex-grow border-t border-gray-200"></div>
        <span className="mx-4 text-sm text-gray-500">or continue with</span>
        <div className="flex-grow border-t border-gray-200"></div>
      </div>

      {/* Social Login */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <SocialButton
          provider="google"
          onClick={() => handleSocialLogin("google")}
          isLoading={isLoading}
        />
        <SocialButton
          provider="facebook"
          onClick={() => handleSocialLogin("facebook")}
          isLoading={isLoading}
        />
      </div>

      {/* Sign Up Link */}
      <p className="text-center text-sm text-gray-600">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="font-medium text-orange-500 hover:text-orange-600 transition-colors"
        >
          Sign up
        </Link>
      </p>
    </>
  );
};

export default LoginPage;
