import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";

import {
  AuthHeading,
  PasswordInput,
  PasswordStrengthMeter,
  SubmitButton,
} from "@/components/auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import authService from "@/services/authService";

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

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const token = searchParams.get("token") ?? "";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isInvalidToken, setIsInvalidToken] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const password = form.watch("newPassword");

  useEffect(() => {
    if (!token) setIsInvalidToken(true);
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsSubmitting(true);
    try {
      const response = await authService.resetPassword(token, data.newPassword);
      if (response.success) {
        setIsSuccess(true);
        toast({
          title: "Password reset",
          description: "You can now log in with your new password.",
        });
      } else {
        const msg = (response.message || "").toLowerCase();
        if (msg.includes("expired") || msg.includes("invalid token")) {
          setIsInvalidToken(true);
        } else {
          toast({
            title: "Couldn't reset password",
            description: response.message || "Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Invalid / missing token ──────────────────────────────────
  if (isInvalidToken) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="text-center"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
          Invalid or expired link
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          This reset link is no longer valid — it may have expired or already
          been used. Request a fresh one to continue.
        </p>
        <div className="space-y-3">
          <SubmitButton onClick={() => navigate("/forgot-password")}>
            Request new link
          </SubmitButton>
          <Button variant="outline" size="lg" onClick={() => navigate("/login")} className="w-full">
            Back to login
          </Button>
        </div>
      </motion.div>
    );
  }

  // ── Success ──────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="text-center"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
          Password reset complete
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          Your password has been updated. You can now log in with your new
          password.
        </p>
        <SubmitButton onClick={() => navigate("/login")}>
          <ShieldCheck className="mr-2 h-4 w-4" />
          Go to login
        </SubmitButton>
      </motion.div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────
  return (
    <>
      <Link
        to="/login"
        className="mb-8 inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to login
      </Link>

      <AuthHeading
        title="Set a new password"
        subtitle="Choose a strong password that's different from previous ones."
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    autoFocus
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
                    placeholder="Re-enter your new password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <SubmitButton loading={isSubmitting} loadingText="Resetting…">
            Reset password
          </SubmitButton>
        </form>
      </Form>
    </>
  );
};

export default ResetPassword;
