/**
 * DeliveryStageStepper — vertical progress tracker for a single delivery,
 * mirroring the DoorDash/Uber courier journey. Presentational only; the parent
 * owns the "advance" action and derives the next step from `nextStageAction`.
 */
import { Check, Flag, Home, PackageCheck, Store, Truck, type LucideIcon } from "lucide-react";
import * as React from "react";

import {
  DELIVERY_STAGE_SEQUENCE,
  type DeliveryStage,
} from "@/services/riderService";
import { cn } from "@/utils/cn";

interface StageMeta {
  key: DeliveryStage;
  label: string;
  hint: string;
  icon: LucideIcon;
}

export const STAGE_META: StageMeta[] = [
  {
    key: "heading_to_store",
    label: "Head to the restaurant",
    hint: "Drive to the pickup location",
    icon: Store,
  },
  {
    key: "at_store",
    label: "Arrived at restaurant",
    hint: "Collect the order from staff",
    icon: Flag,
  },
  {
    key: "picked_up",
    label: "Order picked up",
    hint: "Confirm you have all items",
    icon: PackageCheck,
  },
  {
    key: "heading_to_customer",
    label: "On the way to customer",
    hint: "Drive to the drop-off",
    icon: Truck,
  },
  {
    key: "arrived",
    label: "Arrived at customer",
    hint: "Hand over and complete",
    icon: Home,
  },
];

/**
 * Given the current stage (or `undefined`/`delivered`), returns the CTA the
 * rider should tap next. `target` is the stage to advance to, or `"deliver"`
 * to finalize the delivery (proof + COD).
 */
export function nextStageAction(
  current: DeliveryStage | undefined,
  delivered: boolean,
): { label: string; target: DeliveryStage | "deliver" } | null {
  if (delivered) return null;
  const idx = current ? DELIVERY_STAGE_SEQUENCE.indexOf(current) : -1;
  switch (current) {
    case undefined:
    case "heading_to_store":
      return { label: "I've arrived at the restaurant", target: "at_store" };
    case "at_store":
      return { label: "Confirm pickup", target: "picked_up" };
    case "picked_up":
      return { label: "Start delivery", target: "heading_to_customer" };
    case "heading_to_customer":
      return { label: "I've reached the customer", target: "arrived" };
    case "arrived":
      return { label: "Complete delivery", target: "deliver" };
    default:
      return idx < DELIVERY_STAGE_SEQUENCE.length - 1
        ? {
            label: "Continue",
            target: DELIVERY_STAGE_SEQUENCE[idx + 1],
          }
        : { label: "Complete delivery", target: "deliver" };
  }
}

export interface DeliveryStageStepperProps {
  current: DeliveryStage | undefined;
  delivered?: boolean;
  className?: string;
}

export const DeliveryStageStepper: React.FC<DeliveryStageStepperProps> = ({
  current,
  delivered,
  className,
}) => {
  const currentIdx = delivered
    ? STAGE_META.length
    : current
      ? DELIVERY_STAGE_SEQUENCE.indexOf(current)
      : 0;

  return (
    <ol className={cn("space-y-1", className)}>
      {STAGE_META.map((stage, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx && !delivered;
        const Icon = stage.icon;
        return (
          <li key={stage.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                  done && "border-emerald-500 bg-emerald-500 text-white",
                  active && "border-brand-500 bg-accent text-brand-600",
                  !done && !active && "border-border bg-card text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </span>
              {idx < STAGE_META.length - 1 && (
                <span
                  className={cn(
                    "my-0.5 w-0.5 flex-1",
                    idx < currentIdx ? "bg-emerald-500" : "bg-border",
                  )}
                  style={{ minHeight: 18 }}
                />
              )}
            </div>
            <div className={cn("pb-3", active ? "" : "opacity-90")}>
              <p
                className={cn(
                  "text-sm font-medium",
                  active ? "text-foreground" : "text-foreground/80",
                )}
              >
                {stage.label}
              </p>
              <p className="text-xs text-muted-foreground">{stage.hint}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default DeliveryStageStepper;
