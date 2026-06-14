/**
 * AvailabilityToggle — the rider's online/offline control. Two shapes:
 * `hero` (a full banner for the dashboard) and `compact` (a pill for the shell
 * header). Both share the same wiring so state stays consistent.
 */
import { Switch } from "@/components/ui/switch";
import { cn } from "@/utils/cn";
import * as React from "react";

export interface AvailabilityToggleProps {
  online: boolean;
  onToggle: () => void;
  loading?: boolean;
  /** When set, the control is disabled and shows this reason (e.g. mid-delivery). */
  lockedReason?: string | null;
  variant?: "hero" | "compact";
  className?: string;
}

export const AvailabilityToggle: React.FC<AvailabilityToggleProps> = ({
  online,
  onToggle,
  loading,
  lockedReason,
  variant = "hero",
  className,
}) => {
  const locked = !!lockedReason;

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            online ? "animate-pulse bg-emerald-500" : "bg-muted-foreground/40",
          )}
        />
        <span className="hidden text-sm font-medium text-foreground sm:inline">
          {online ? "Online" : "Offline"}
        </span>
        <Switch
          checked={online}
          onCheckedChange={onToggle}
          disabled={loading || locked}
          aria-label="Toggle availability"
          className="data-[state=checked]:bg-emerald-500"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border p-5 transition-colors",
        online
          ? "border-emerald-200 bg-emerald-50"
          : "border-border bg-muted/40",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "h-3 w-3 rounded-full",
            online ? "animate-pulse bg-emerald-500" : "bg-muted-foreground/40",
          )}
        />
        <div>
          <p className="font-semibold text-foreground">
            {online ? "You're online" : "You're offline"}
          </p>
          <p className="text-sm text-muted-foreground">
            {locked
              ? lockedReason
              : online
                ? "Accepting new delivery requests"
                : "Toggle on to start receiving deliveries"}
          </p>
        </div>
      </div>
      <Switch
        checked={online}
        onCheckedChange={onToggle}
        disabled={loading || locked}
        aria-label="Toggle availability"
        className="data-[state=checked]:bg-emerald-500"
      />
    </div>
  );
};

export default AvailabilityToggle;
