import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import {
  AuthHeading,
  AuthTabs,
  OAuthSection,
  PasswordInput,
  PasswordStrengthMeter,
  SubmitButton,
} from "@/components/auth";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRedirectIfAuthenticated } from "@/hooks/useAuthRedirect";
import { applyServerErrors } from "@/lib/formErrors";
import { toast } from "@/lib/toast";
import { registerSchema, type RegisterFormData } from "@/lib/validation";
import authService from "@/services/authService";

const RegisterPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useRedirectIfAuthenticated();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      agreedToTerms: false,
    },
  });

  const password = form.watch("password");

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const response = await authService.register({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: data.password,
      });

      if (response.success) {
        toast.success("Account created", {
          description: "Check your email for a verification code.",
        });
        navigate("/verify-email", { state: { email: data.email } });
      } else {
        applyServerErrors(form, response);
      }
    } catch (err) {
      applyServerErrors(form, err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: "google" | "facebook") => {
    if (provider === "google") {
      authService.startGoogleAuth("/");
      return;
    }
    toast.info("Coming soon", { description: `${provider} sign-up is on the way.` });
  };

  return (
    <>
      <AuthHeading
        title="Create your account"
        subtitle="Join Food Rush and enjoy Sylhet's best flavours at your door."
      />

      <AuthTabs active="register" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input autoComplete="given-name" placeholder="First name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input autoComplete="family-name" placeholder="Last name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
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
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    autoComplete="tel"
                    placeholder="+8801XXXXXXXXX"
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
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    {...field}
                  />
                </FormControl>
                <PasswordStrengthMeter password={password} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="agreedToTerms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-1">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-0.5"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm font-normal text-muted-foreground">
                    I agree to the{" "}
                    <Link to="/terms" className="font-medium text-brand-600 hover:text-brand-700">
                      Terms
                    </Link>{" "}
                    &amp;{" "}
                    <Link to="/privacy" className="font-medium text-brand-600 hover:text-brand-700">
                      Privacy Policy
                    </Link>
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <SubmitButton loading={isLoading} loadingText="Creating account…">
            Create account
          </SubmitButton>
        </form>
      </Form>

      <OAuthSection onProvider={handleSocialLogin} isLoading={isLoading} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-brand-600 transition-colors hover:text-brand-700"
        >
          Log in
        </Link>
      </p>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Want to partner with us?{" "}
        <Link to="/vendor/register" className="font-medium text-brand-600 hover:text-brand-700">
          Add your restaurant
        </Link>{" "}
        ·{" "}
        <Link to="/rider/register" className="font-medium text-brand-600 hover:text-brand-700">
          Become a rider
        </Link>
      </p>
    </>
  );
};

export default RegisterPage;
