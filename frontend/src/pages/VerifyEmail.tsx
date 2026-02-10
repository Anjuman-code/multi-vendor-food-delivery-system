import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Mail, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import authService from "../services/authService";

/**
 * VerifyEmail - Email verification prompt page.
 *
 * This page is wrapped by AuthLayout which provides:
 * - Split-screen layout with branding
 * - Logo and footer
 *
 * Expects `location.state.email` to have been set by RegisterPage.
 */
const VerifyEmail: React.FC = () => {
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email;

  const handleResendEmail = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Email address is missing. Please register again.",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);

    try {
      const response = await authService.resendVerification(email);

      if (response.success) {
        toast({
          title: "Email sent",
          description: "A new verification email has been sent to your inbox.",
        });
      } else {
        toast({
          title: "Error",
          description:
            response.message || "Failed to resend verification email.",
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
      setIsResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="text-center"
    >
      {/* Icon */}
      <div className="mb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto">
          <Mail className="w-10 h-10 text-orange-500" />
        </div>
      </div>

      {/* Header */}
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        Verify your email
      </h2>
      <p className="text-gray-600 mb-8 leading-relaxed">
        We've sent a verification link to{" "}
        {email ? (
          <span className="font-semibold text-gray-800">{email}</span>
        ) : (
          "your email address"
        )}
        . Please check your inbox and click the link to verify your account.
      </p>

      {/* Status Indicator */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-8">
        <div className="flex items-center justify-center gap-2 text-orange-600">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium">
            Waiting for verification...
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-4">
        <Link to="/login">
          <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-200 h-11">
            <CheckCircle className="w-4 h-4 mr-2" />
            Go to Login
          </Button>
        </Link>

        <div className="text-sm text-gray-600">
          Didn't receive the email?{" "}
          <button
            onClick={handleResendEmail}
            disabled={isResending}
            className="text-orange-500 hover:text-orange-600 font-medium transition-colors disabled:opacity-50"
          >
            {isResending ? "Sending..." : "Resend verification email"}
          </button>
        </div>
      </div>

      {/* Help Text */}
      <p className="mt-8 text-xs text-gray-500">
        Make sure to check your spam folder if you don't see the email in your
        inbox.
      </p>
    </motion.div>
  );
};

export default VerifyEmail;
