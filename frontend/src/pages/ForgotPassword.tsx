import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, CheckCircle, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import authService from "../services/authService";

interface Errors {
  email?: string;
  general?: string;
}

/**
 * ForgotPassword - Password reset request page.
 *
 * This page is wrapped by AuthLayout which provides:
 * - Split-screen layout with branding
 * - Logo and footer
 */
const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [errors, setErrors] = useState<Errors>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const navigate = useNavigate();

  const validateEmail = (email: string): string => {
    if (!email) return "Email is required";
    if (!/\S+@\S+\.\S+/.test(email)) return "Email address is invalid";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.forgotPassword(email);

      if (response.success) {
        setIsSubmitted(true);
      } else {
        setErrors({ general: response.message || "Failed to send reset link" });
      }
    } catch {
      setErrors({ general: "An error occurred while sending reset link" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/login");
  };

  // Success State
  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Check your email
        </h2>
        <p className="text-gray-600 mb-8">
          We've sent a password reset link to{" "}
          <span className="font-semibold text-gray-800">{email}</span>
        </p>

        <Button
          onClick={handleBackToLogin}
          className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-200 h-11"
        >
          Back to Login
        </Button>

        <p className="mt-6 text-sm text-gray-500">
          Didn't receive the email?{" "}
          <button
            onClick={() => setIsSubmitted(false)}
            className="text-orange-500 hover:text-orange-600 font-medium transition-colors"
          >
            Try again
          </button>
        </p>
      </motion.div>
    );
  }

  // Form State
  return (
    <>
      {/* Back Link */}
      <Link
        to="/login"
        className="inline-flex items-center text-sm text-gray-600 hover:text-orange-500 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to login
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Reset your password
        </h2>
        <p className="text-gray-600">
          Enter your email address and we'll send you a link to reset your
          password.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {errors.general && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {errors.general}
          </div>
        )}

        <div>
          <Label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors({});
              }}
              placeholder="Enter your email"
              className={`pl-10 ${errors.email ? "border-red-500 focus:ring-red-500" : ""}`}
            />
          </div>
          {errors.email && (
            <p className="mt-2 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-200 h-11"
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
              Sending reset link...
            </span>
          ) : (
            "Send Reset Link"
          )}
        </Button>
      </form>
    </>
  );
};

export default ForgotPassword;
