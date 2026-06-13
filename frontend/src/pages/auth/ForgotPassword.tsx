import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowLeft, MailCheck } from "lucide-react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { AuthHeading, SubmitButton } from "@/components/auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validation";
import authService from "@/services/authService";

const ForgotPassword: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      const response = await authService.forgotPassword(data.email);
      if (response.success) {
        setSentTo(data.email);
      } else {
        toast({
          title: "Couldn't send reset link",
          description: response.message || "Please try again.",
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

  // ── Success state ────────────────────────────────────────────
  if (sentTo) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="text-center"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <MailCheck className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
          Check your email
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          We&apos;ve sent a password reset link to{" "}
          <span className="font-semibold text-foreground">{sentTo}</span>. The
          link expires shortly, so use it soon.
        </p>

        <SubmitButton onClick={() => navigate("/login")}>Back to login</SubmitButton>

        <p className="mt-6 text-sm text-muted-foreground">
          Didn&apos;t get it?{" "}
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="font-medium text-brand-600 transition-colors hover:text-brand-700"
          >
            Try a different email
          </button>
        </p>
      </motion.div>
    );
  }

  // ── Form state ───────────────────────────────────────────────
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
        title="Reset your password"
        subtitle="Enter your email and we'll send you a link to set a new password."
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    autoFocus
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <SubmitButton loading={isLoading} loadingText="Sending link…">
            Send reset link
          </SubmitButton>
        </form>
      </Form>
    </>
  );
};

export default ForgotPassword;
