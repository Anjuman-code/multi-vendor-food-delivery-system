import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { AuthUser } from "@/services/authService";

/**
 * Single source of truth for "where does a user go after authenticating".
 *
 * Previously this role + onboarding branching was copy-pasted across
 * LoginPage, VerifyEmail and GoogleAuthCallbackPage. Keep it here so the
 * redirect rules stay consistent everywhere.
 */
export function getPostAuthPath(user: Pick<AuthUser, "role" | "onboardingCompleted">): string {
  const isAdminOrSupport = user.role === "admin" || user.role === "support";
  const base =
    user.role === "vendor"
      ? "/vendor"
      : isAdminOrSupport
        ? "/admin"
        : user.role === "driver"
          ? "/rider"
          : "/";

  if (isAdminOrSupport || user.onboardingCompleted) return base;
  if (user.role === "driver") return "/rider/onboarding";
  if (user.role === "vendor") return "/vendor/onboarding";
  return "/onboarding";
}

/**
 * Bounce already-authenticated users away from auth pages (login/register/…).
 * Drop-in replacement for the repeated `useEffect(() => { if (isAuthenticated) navigate(...) })`.
 */
export function useRedirectIfAuthenticated(): void {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getPostAuthPath(user), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);
}
