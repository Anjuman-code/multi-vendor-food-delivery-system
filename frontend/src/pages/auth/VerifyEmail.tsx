import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { AuthHeading, OTPInput, SubmitButton } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getPostAuthPath } from "@/hooks/useAuthRedirect";
import { useToast } from "@/hooks/use-toast";
import authService from "@/services/authService";

type Status = "idle" | "verifying-token" | "verifying-otp" | "success" | "error";

const VerifyEmail: React.FC = () => {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();

  const email = (location.state as { email?: string } | null)?.email;
  const tokenFromURL = searchParams.get("token");

  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [otp, setOtp] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Complete: store tokens, hydrate auth, redirect by role ───
  const completeVerification = useCallback(
    (response: Awaited<ReturnType<typeof authService.verifyEmail>>) => {
      if (response.success && response.data?.user) {
        const { accessToken, refreshToken, user } = response.data;
        if (accessToken) localStorage.setItem("accessToken", accessToken);
        if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
        login(user);
        navigate(getPostAuthPath(user), { replace: true });
        return;
      }
      if (response.success) {
        setStatus("success");
        return;
      }
      setStatus("error");
      setErrorMessage(response.message || "Verification failed.");
    },
    [login, navigate],
  );

  // ── Auto-verify from email link ──────────────────────────────
  const verifyToken = useCallback(
    async (token: string) => {
      setStatus("verifying-token");
      setErrorMessage("");
      const response = await authService.verifyEmail(token);
      if (!response.success) {
        setStatus("error");
        setErrorMessage(response.message || "Invalid or expired verification link.");
        return;
      }
      completeVerification(response);
    },
    [completeVerification],
  );

  useEffect(() => {
    if (tokenFromURL) verifyToken(tokenFromURL);
  }, [tokenFromURL, verifyToken]);

  // ── Resend cooldown ──────────────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleVerifyOTP = useCallback(async () => {
    if (!email) {
      toast({
        title: "Missing email",
        description: "Please register again to receive a new code.",
        variant: "destructive",
      });
      return;
    }
    if (otp.length !== 6) return;

    setStatus("verifying-otp");
    setErrorMessage("");
    const response = await authService.verifyOTP(email, otp);
    if (!response.success) {
      setStatus("error");
      setErrorMessage(response.message || "Invalid or expired code.");
      setOtp("");
      return;
    }
    completeVerification(response);
  }, [email, otp, toast, completeVerification]);

  // ── Auto-submit once 6 digits are entered ────────────────────
  useEffect(() => {
    if (otp.length === 6 && status === "idle") void handleVerifyOTP();
  }, [otp, status, handleVerifyOTP]);

  const handleResend = async () => {
    if (!email) {
      toast({
        title: "Missing email",
        description: "Please register again to receive a new code.",
        variant: "destructive",
      });
      return;
    }
    setIsResending(true);
    try {
      const response = await authService.resendVerification(email);
      if (response.success) {
        toast({ title: "Code sent", description: "A new code is on its way to your inbox." });
        setResendCooldown(60);
        setOtp("");
        setStatus("idle");
        setErrorMessage("");
      } else {
        toast({
          title: "Couldn't resend",
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
      setIsResending(false);
    }
  };

  // ── Token auto-verify view (loading / success / error) ───────
  if (tokenFromURL) {
    return (
      <div className="text-center">
        <AnimatePresence mode="wait">
          {(status === "idle" || status === "verifying-token") && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              </div>
              <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
                Verifying your email…
              </h1>
              <p className="text-sm text-muted-foreground">Hang tight, this only takes a moment.</p>
            </motion.div>
          )}

          {status === "success" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">Email verified!</h1>
              <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
                Your email is confirmed. You can now log in to your account.
              </p>
              <SubmitButton onClick={() => navigate("/login", { replace: true })}>
                Continue to login
              </SubmitButton>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div key="error" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">Verification failed</h1>
              <p className="mb-8 text-sm leading-relaxed text-muted-foreground">{errorMessage}</p>
              <Link to="/register">
                <Button variant="outline" size="lg" className="w-full">
                  Register again
                </Button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── OTP entry view (main flow) ───────────────────────────────
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
        <Mail className="h-8 w-8 text-brand-500" />
      </div>

      <AuthHeading
        className="text-center"
        title="Verify your email"
        subtitle={
          <>
            We sent a 6-digit code to{" "}
            {email ? (
              <span className="font-semibold text-foreground">{email}</span>
            ) : (
              "your email address"
            )}
            . Enter it below or use the link in the email.
          </>
        }
      />

      {status === "error" && errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMessage}
        </motion.div>
      )}

      <div className="mb-6">
        <OTPInput
          value={otp}
          onChange={setOtp}
          disabled={status === "verifying-otp"}
          invalid={status === "error"}
          autoFocus
        />
      </div>

      <SubmitButton
        onClick={handleVerifyOTP}
        loading={status === "verifying-otp"}
        loadingText="Verifying…"
        disabled={otp.length !== 6}
        className="mb-5"
      >
        Verify email
      </SubmitButton>

      <p className="text-sm text-muted-foreground">
        Didn&apos;t get the code?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending || resendCooldown > 0}
          className="font-medium text-brand-600 transition-colors hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isResending ? "Sending…" : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
        </button>
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Already verified?{" "}
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Log in
        </Link>
      </p>
      <p className="mt-6 text-xs text-muted-foreground">
        Check your spam folder if it doesn&apos;t arrive within a minute.
      </p>
    </div>
  );
};

export default VerifyEmail;
