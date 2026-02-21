import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import authService from "../services/authService";

// ── Schema ─────────────────────────────────────────────────────

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must not exceed 128 characters")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number")
      .regex(
        /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/,
        "Must contain at least one special character",
      ),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// ── Password strength helper ───────────────────────────────────

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

const getPasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score, label: "Fair", color: "bg-orange-500" };
  if (score <= 3) return { score, label: "Good", color: "bg-yellow-500" };
  if (score <= 4) return { score, label: "Strong", color: "bg-green-500" };
  return { score, label: "Very Strong", color: "bg-emerald-500" };
};

// ── Component ──────────────────────────────────────────────────

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const token = searchParams.get("token") ?? "";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isInvalidToken, setIsInvalidToken] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const watchedPassword = watch("newPassword");
  const strength = getPasswordStrength(watchedPassword || "");

  // Validate token presence on mount
  useEffect(() => {
    if (!token) {
      setIsInvalidToken(true);
    }
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsSubmitting(true);
    try {
      const response = await authService.resetPassword(token, data.newPassword);
      if (response.success) {
        setIsSuccess(true);
        toast({
          title: "Password reset successful",
          description: "You can now log in with your new password.",
        });
      } else {
        // Check for token expiry / invalid token type errors
        const msg = response.message || "";
        if (
          msg.toLowerCase().includes("expired") ||
          msg.toLowerCase().includes("invalid token")
        ) {
          setIsInvalidToken(true);
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to reset password.",
            variant: "destructive",
          });
        }
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Invalid / missing token state ────────────────────────────
  if (isInvalidToken) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Invalid or expired link
        </h2>
        <p className="text-gray-600 mb-8">
          This password reset link is no longer valid. It may have expired or
          already been used. Please request a new one.
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => navigate("/forgot-password")}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-200 h-11"
          >
            Request New Link
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/login")}
            className="w-full h-11"
          >
            Back to Login
          </Button>
        </div>
      </motion.div>
    );
  }

  // ── Success state ────────────────────────────────────────────
  if (isSuccess) {
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
          Password reset complete
        </h2>
        <p className="text-gray-600 mb-8">
          Your password has been successfully reset. You can now log in with
          your new password.
        </p>

        <Button
          onClick={() => navigate("/login")}
          className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-200 h-11"
        >
          <ShieldCheck className="w-5 h-5 mr-2" />
          Go to Login
        </Button>
      </motion.div>
    );
  }

  // ── Form state ───────────────────────────────────────────────
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
          Set new password
        </h2>
        <p className="text-gray-600">
          Choose a strong password to secure your account. Your new password
          must be different from previously used passwords.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* New Password */}
        <div>
          <Label
            htmlFor="newPassword"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            New Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type={showPassword ? "text" : "password"}
              id="newPassword"
              {...register("newPassword")}
              placeholder="Create a strong password"
              className={`pl-10 pr-10 ${errors.newPassword ? "border-red-500 focus:ring-red-500" : ""}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Password strength indicator */}
          <AnimatePresence>
            {watchedPassword && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-1.5"
              >
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                        i <= strength.score ? strength.color : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Password strength:{" "}
                  <span className="font-medium">{strength.label}</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {errors.newPassword && (
            <p className="mt-2 text-sm text-red-600">
              {errors.newPassword.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <Label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Confirm Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type={showConfirm ? "text" : "password"}
              id="confirmPassword"
              {...register("confirmPassword")}
              placeholder="Confirm your new password"
              className={`pl-10 pr-10 ${errors.confirmPassword ? "border-red-500 focus:ring-red-500" : ""}`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-2 text-sm text-red-600">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-200 h-11"
        >
          {isSubmitting ? (
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
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Resetting password…
            </span>
          ) : (
            "Reset Password"
          )}
        </Button>
      </form>
    </>
  );
};

export default ResetPassword;
