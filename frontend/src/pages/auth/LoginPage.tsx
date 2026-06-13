import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  AuthHeading,
  AuthTabs,
  OAuthSection,
  PasswordInput,
  SubmitButton,
} from "@/components/auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { getPostAuthPath, useRedirectIfAuthenticated } from "@/hooks/useAuthRedirect";
import { useToast } from "@/hooks/use-toast";
import { loginSchema, type LoginFormData } from "@/lib/validation";
import authService from "@/services/authService";

const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();

  useRedirectIfAuthenticated();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { emailOrPhone: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await authService.login(data);

      if (response.success && response.data) {
        const { accessToken, refreshToken, user } = response.data;
        if (accessToken) localStorage.setItem("accessToken", accessToken);
        if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
        login(user);
        toast({ title: "Welcome back!", description: "Redirecting you now…" });
        navigate(getPostAuthPath(user));
      } else {
        toast({
          title: "Login failed",
          description: response.message || "Invalid credentials. Please try again.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: "google" | "facebook") => {
    if (provider === "google") {
      const state = location.state as { from?: string } | null;
      authService.startGoogleAuth(typeof state?.from === "string" ? state.from : "/");
      return;
    }
    toast({ title: "Coming soon", description: `${provider} login is on the way.` });
  };

  return (
    <>
      <AuthHeading
        title="Welcome back"
        subtitle="Log in to order, track deliveries and manage your account."
      />

      <AuthTabs active="login" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="emailOrPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email or phone</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    autoComplete="username"
                    placeholder="you@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <PasswordInput
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <SubmitButton loading={isLoading} loadingText="Logging in…" className="mt-2">
            Log in
          </SubmitButton>
        </form>
      </Form>

      <OAuthSection onProvider={handleSocialLogin} isLoading={isLoading} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          to="/register"
          className="font-semibold text-brand-600 transition-colors hover:text-brand-700"
        >
          Sign up
        </Link>
      </p>
    </>
  );
};

export default LoginPage;
