import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import React from "react";

interface StepNavProps {
  /** Back handler — when omitted, the back button is hidden. */
  onBack?: () => void;
  /** Skip handler — when omitted, the skip link is hidden. */
  onSkip?: () => void;
  skipLabel?: string;
  /** Primary button label. */
  nextLabel?: string;
  /** When set, the primary button is a submit button (for RHF forms). */
  submit?: boolean;
  /** Primary click handler (ignored when `submit`). */
  onNext?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

/**
 * Footer navigation row shared by every onboarding step — back / skip on the
 * left, the primary action (continue / finish) on the right.
 */
const StepNav: React.FC<StepNavProps> = ({
  onBack,
  onSkip,
  skipLabel = "Skip",
  nextLabel = "Continue",
  submit = false,
  onNext,
  isLoading = false,
  disabled = false,
}) => (
  <div className="mt-8 flex items-center gap-3">
    {onBack && (
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onBack}
        disabled={isLoading}
        className="gap-1.5"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
    )}

    {onSkip && (
      <Button
        type="button"
        variant="ghost"
        size="lg"
        onClick={onSkip}
        disabled={isLoading}
        className="text-muted-foreground hover:text-foreground"
      >
        {skipLabel}
      </Button>
    )}

    <Button
      type={submit ? "submit" : "button"}
      variant="brand"
      size="lg"
      onClick={submit ? undefined : onNext}
      disabled={isLoading || disabled}
      className="ml-auto min-w-[9.5rem] gap-2"
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {isLoading ? "Please wait…" : nextLabel}
    </Button>
  </div>
);

export default StepNav;
