import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  Mail,
  CheckCircle,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import authService from "../services/authService";

// ── Types ──────────────────────────────────────────────────────

type VerificationState =
  | "idle"
  | "verifying-token"
  | "verifying-otp"
  | "success"
  | "error";

// ── OTP Input Component ────────────────────────────────────────

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChange,
  disabled = false,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return;
    const newValue = value.split("");
    newValue[index] = char;
    const joined = newValue.join("").slice(0, length);
    onChange(joined);
    if (char && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    onChange(pasted);
    const focusIndex = Math.min(pasted.length, length - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <Input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          className="w-11 h-13 sm:w-13 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 rounded-lg
            focus:border-orange-500 focus:ring-orange-500/20 transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────

/**
 * VerifyEmail – handles email verification via OTP input or token link.
 *
 * Scenarios:
 * 1. Redirected from RegisterPage with `state.email` → shows OTP input form.
 * 2. Opened via verification link with `?token=xxx` → auto-verifies.
 */
const VerifyEmail: React.FC = () => {
  const { toast } = useToast();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const email = (location.state as { email?: string } | null)?.email;
  const tokenFromURL = searchParams.get("token");

  const [status, setStatus] = useState<VerificationState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [otp, setOtp] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Auto-verify from link token ────────────────────────────

  const verifyToken = useCallback(async (token: string) => {
    setStatus("verifying-token");
    setErrorMessage("");

    const response = await authService.verifyEmail(token);

    if (response.success) {
      setStatus("success");
    } else {
      setStatus("error");
      setErrorMessage(
        response.message || "Invalid or expired verification link.",
      );
    }
  }, []);

  useEffect(() => {
    if (tokenFromURL) {
      verifyToken(tokenFromURL);
    }
  }, [tokenFromURL, verifyToken]);

  // ── Resend cooldown timer ──────────────────────────────────

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // ── Handlers ───────────────────────────────────────────────

  const handleVerifyOTP = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Email address is missing. Please register again.",
        variant: "destructive",
      });
      return;
    }
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the complete 6-digit code.",
        variant: "destructive",
      });
      return;
    }

    setStatus("verifying-otp");
    setErrorMessage("");

    const response = await authService.verifyOTP(email, otp);

    if (response.success) {
      setStatus("success");
    } else {
      setStatus("error");
      setErrorMessage(response.message || "Invalid or expired OTP.");
      setOtp("");
    }
  };

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
        setResendCooldown(60);
        setOtp("");
        setStatus("idle");
        setErrorMessage("");
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

  // ── Auto-submit when OTP is complete ───────────────────────

  useEffect(() => {
    if (otp.length === 6 && status === "idle") {
      handleVerifyOTP();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  // ── Render: Token auto-verify (loading / success / error) ──

  if (tokenFromURL) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <AnimatePresence mode="wait">
          {status === "verifying-token" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Verifying your email…
              </h2>
              <p className="text-gray-600">
                Please wait while we verify your email address.
              </p>
            </motion.div>
          )}

          {status === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Email verified!
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Your email has been successfully verified. You can now log in to
                your account.
              </p>
              <Link to="/login">
                <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-200 h-11">
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Go to Login
                </Button>
              </Link>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Verification failed
              </h2>
              <p className="text-gray-600 mb-8">{errorMessage}</p>
              <div className="space-y-3">
                <Link to="/register">
                  <Button variant="outline" className="w-full h-11">
                    Register again
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ── Render: OTP verification (main flow) ───────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="text-center"
    >
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Email verified!
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Your email has been successfully verified. You can now log in to
              your account.
            </p>
            <Link to="/login">
              <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-200 h-11">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Go to Login
              </Button>
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
            <p className="text-gray-600 mb-2 leading-relaxed">
              We've sent a 6-digit verification code to{" "}
              {email ? (
                <span className="font-semibold text-gray-800">{email}</span>
              ) : (
                "your email address"
              )}
            </p>
            <p className="text-gray-500 text-sm mb-8">
              Enter the code below or click the link in the email.
            </p>

            {/* Error banner */}
            {status === "error" && errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
              >
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{errorMessage}</span>
                </div>
              </motion.div>
            )}

            {/* OTP Input */}
            <div className="mb-6">
              <OTPInput
                value={otp}
                onChange={setOtp}
                disabled={status === "verifying-otp"}
              />
            </div>

            {/* Verify button */}
            <Button
              onClick={handleVerifyOTP}
              disabled={otp.length !== 6 || status === "verifying-otp"}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-200 h-11 mb-4"
            >
              {status === "verifying-otp" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying…
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Verify Email
                </>
              )}
            </Button>

            {/* Resend / Go to Login */}
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                Didn't receive the code?{" "}
                <button
                  onClick={handleResendEmail}
                  disabled={isResending || resendCooldown > 0}
                  className="text-orange-500 hover:text-orange-600 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResending
                    ? "Sending…"
                    : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend code"}
                </button>
              </div>

              <Link
                to="/login"
                className="block text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Already verified?{" "}
                <span className="font-medium text-orange-500">Log in</span>
              </Link>
            </div>

            {/* Help Text */}
            <p className="mt-8 text-xs text-gray-500">
              Check your spam folder if you don't see the email in your inbox.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VerifyEmail;
