import { Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/utils/cn";

interface SubmitButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

/**
 * Full-width brand CTA with a built-in loading spinner. Replaces the six
 * hand-rolled inline-SVG spinner blocks and the inline `from-orange-500…`
 * gradients scattered across the auth pages (now the `brand` button variant).
 */
export function SubmitButton({
  loading = false,
  loadingText,
  children,
  className,
  disabled,
  variant = "brand",
  size = "lg",
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={loading || disabled}
      className={cn("w-full", className)}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText ?? "Please wait…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
