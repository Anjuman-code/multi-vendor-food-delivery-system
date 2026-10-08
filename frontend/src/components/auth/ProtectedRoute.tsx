import * as React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getPostAuthPath } from "@/hooks/useAuthRedirect";
import { Loader2 } from "lucide-react";

export interface ProtectedRouteProps {
  /** Roles permitted to access the guarded subtree. If omitted, any authenticated user is allowed. */
  allowedRoles?: string[];
  /** Optional custom fallback route when unauthenticated (defaults to /login) */
  loginPath?: string;
  children?: React.ReactNode;
}

/**
 * Universal Route Guard component for private role surfaces.
 * Handles session restoration loading states, unauthenticated redirection to /login,
 * and role-mismatch redirection back to the user's primary post-auth portal.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  loginPath = "/login",
  children,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading..." />
        <p className="mt-4 text-sm text-muted-foreground font-medium">
          Verifying authorization…
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Authenticated, but lacking permission for this role subtree.
    // Bounce them safely back to their designated role dashboard or home.
    return <Navigate to={getPostAuthPath(user)} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
