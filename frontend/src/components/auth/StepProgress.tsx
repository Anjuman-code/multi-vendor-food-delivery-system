import React from "react";
import { Check } from "lucide-react";

import { cn } from "@/utils/cn";

interface StepProgressProps {
  steps: { label: string }[];
  /** Zero-based index of the active step. */
  current: number;
  /** Allow clicking back to a completed step. */
  onStepClick?: (index: number) => void;
}

/**
 * Horizontal stepper for the multi-step vendor / rider registrations.
 * Completed steps show a check and (optionally) navigate back.
 */
export function StepProgress({ steps, current, onStepClick }: StepProgressProps) {
  return (
    <div className="mb-7 flex items-center gap-2">
      {steps.map((step, i) => {
        const isComplete = i < current;
        const isActive = i === current;
        const clickable = isComplete && Boolean(onStepClick);

        return (
          <React.Fragment key={step.label}>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(i)}
              className={cn(
                "flex items-center gap-2",
                clickable ? "cursor-pointer" : "cursor-default",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  isActive && "bg-gradient-to-br from-brand-500 to-red-500 text-white shadow-sm",
                  isComplete && "bg-green-500 text-white",
                  !isActive && !isComplete && "bg-muted text-muted-foreground",
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:block",
                  isActive && "text-foreground",
                  isComplete && "text-green-600",
                  !isActive && !isComplete && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1",
                  i < current ? "bg-green-400" : "bg-border",
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
