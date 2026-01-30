import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import SocialButton from "../components/SocialButton";
import { registerSchema, type RegisterFormData } from "../lib/validation";

/**
 * RegisterPage - User registration page.
 *
 * This page is wrapped by AuthLayout which provides:
 * - Split-screen layout with branding
 * - Logo and footer
 */

const RegisterPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      agreedToTerms: false,
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      const isSuccess = Math.random() > 0.1; // 90% success rate

      if (isSuccess) {
        console.log("Registration data:", data); // Using the data parameter to prevent the warning
        toast({
          title: "Success",
          description: "Account created successfully! Redirecting...",
        });
        setTimeout(() => {
          navigate("/");
        }, 1500);
      } else {
        toast({
          title: "Error",
          description: "Email already exists",
          variant: "destructive",
        });
      }

      setIsLoading(false);
    }, 1500);
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
          Create an account
        </h2>
        <p className="text-gray-600">
          Join us today and enjoy delicious food from Sylhet!
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-8 border-b border-gray-200">
        <Link
          to="/login"
          className="pb-3 text-gray-500 hover:text-orange-500 font-medium transition-colors"
        >
          Log in
        </Link>
        <Link
          to="/register"
          className="pb-3 text-orange-500 font-semibold border-b-2 border-orange-500 transition-colors"
        >
          Sign Up
        </Link>
      </div>

      {/* Registration Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Enter your full name"
                    {...field}
                    className={
                      form.formState.errors.fullName ? "border-red-500" : ""
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    {...field}
                    className={
                      form.formState.errors.email ? "border-red-500" : ""
                    }
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
                <FormLabel>Phone Number (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="+880 or 01XXXXXXXXX"
                    {...field}
                    className={
                      form.formState.errors.phoneNumber ? "border-red-500" : ""
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <FormLabel>Password</FormLabel>
            <div className="relative">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        className={`${form.formState.errors.password ? "border-red-500" : ""} pr-10`}
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
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-500" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          <div>
            <FormLabel>Confirm Password</FormLabel>
            <div className="relative">
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        className={`${form.formState.errors.confirmPassword ? "border-red-500" : ""} pr-10`}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-500" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          <FormField
            control={form.control}
            name="agreedToTerms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-0.5"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm">
                    I agree to the{" "}
                    <Link
                      to="/terms"
                      className="text-orange-500 hover:text-orange-600 transition-colors"
                    >
                      Terms & Privacy Policy
                    </Link>
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

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
                Creating account...
              </span>
            ) : (
              "Create Account"
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

      {/* Login Link */}
      <p className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-medium text-orange-500 hover:text-orange-600 transition-colors"
        >
          Log in
        </Link>
      </p>
    </>
  );
};

export default RegisterPage;
