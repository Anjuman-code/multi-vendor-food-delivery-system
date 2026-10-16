import SocialButton from "@/components/SocialButton";

interface OAuthSectionProps {
  onProvider: (provider: "google") => void;
  isLoading?: boolean;
  /** Divider caption, e.g. "or continue with". */
  label?: string;
}

/**
 * "or continue with" divider plus the Google OAuth button. Shared by
 * the login and register screens so the social-auth block stays identical.
 */
export function OAuthSection({
  onProvider,
  isLoading = false,
  label = "or continue with",
}: OAuthSectionProps) {
  return (
    <>
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div>
        <SocialButton
          provider="google"
          onClick={() => onProvider("google")}
          isLoading={isLoading}
        />
      </div>
    </>
  );
}
