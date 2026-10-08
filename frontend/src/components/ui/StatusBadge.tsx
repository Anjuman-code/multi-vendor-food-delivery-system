import * as React from "react";
import {
  AlertTriangle,
  Bike,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  Crown,
  Loader2,
  PackageCheck,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/utils/cn";

export type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "brand";

const toneClasses: Record<StatusTone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
  danger: "bg-red-50 text-red-700 ring-red-600/20",
  info: "bg-blue-50 text-blue-700 ring-blue-600/20",
  neutral: "bg-muted text-muted-foreground ring-border",
  brand: "bg-accent text-accent-foreground ring-brand-600/20",
};

export interface StatusMeta {
  label: string;
  tone: StatusTone;
  icon: LucideIcon;
}

/**
 * Universal canonical registry mapping known status strings across
 * orders, reservations, tickets, payouts, riders, restaurants, and users
 * to their accessible label, color tone, and icon.
 */
export const STATUS_REGISTRY: Record<string, StatusMeta> = {
  // ── Order lifecycle ──
  pending: { label: "Pending", tone: "warning", icon: Clock },
  confirmed: { label: "Confirmed", tone: "info", icon: CheckCircle2 },
  preparing: { label: "Preparing", tone: "brand", icon: ChefHat },
  ready: { label: "Ready", tone: "info", icon: PackageCheck },
  ready_for_pickup: { label: "Ready for Pickup", tone: "info", icon: PackageCheck },
  picked_up: { label: "Picked Up", tone: "info", icon: Bike },
  on_the_way: { label: "On the Way", tone: "info", icon: Bike },
  delivered: { label: "Delivered", tone: "success", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", tone: "danger", icon: XCircle },

  // ── Reservation lifecycle ──
  requested: { label: "Requested", tone: "warning", icon: Clock },
  seated: { label: "Seated", tone: "info", icon: CheckCircle2 },
  completed: { label: "Completed", tone: "success", icon: Check },
  no_show: { label: "No Show", tone: "danger", icon: XCircle },

  // ── Ticket / Support lifecycle ──
  open: { label: "Open", tone: "warning", icon: Clock },
  in_progress: { label: "In Progress", tone: "info", icon: Loader2 },
  resolved: { label: "Resolved", tone: "success", icon: CheckCircle2 },
  closed: { label: "Closed", tone: "neutral", icon: Check },

  // ── Payout lifecycle ──
  processing: { label: "Processing", tone: "info", icon: Loader2 },
  failed: { label: "Failed", tone: "danger", icon: AlertTriangle },

  // ── Rider / Fleet availability ──
  available: { label: "Available", tone: "success", icon: CheckCircle2 },
  online: { label: "Online", tone: "success", icon: CheckCircle2 },
  offline: { label: "Offline", tone: "neutral", icon: Clock },
  busy: { label: "Busy", tone: "brand", icon: Bike },
  on_delivery: { label: "On Delivery", tone: "brand", icon: Bike },

  // ── Restaurant & Driver Approval / Moderation ──
  approved: { label: "Approved", tone: "success", icon: CheckCircle2 },
  rejected: { label: "Rejected", tone: "danger", icon: XCircle },
  verified: { label: "Verified", tone: "success", icon: CheckCircle2 },
  unverified: { label: "Unverified", tone: "warning", icon: Clock },

  // ── User account status ──
  active: { label: "Active", tone: "success", icon: CheckCircle2 },
  suspended: { label: "Suspended", tone: "warning", icon: ShieldAlert },
  banned: { label: "Banned", tone: "danger", icon: XCircle },

  // ── Payment states ──
  paid: { label: "Paid", tone: "success", icon: Check },
  unpaid: { label: "Unpaid", tone: "warning", icon: Clock },
  refunded: { label: "Refunded", tone: "neutral", icon: RotateCcw },

  // ── Customer segments ──
  new: { label: "New", tone: "info", icon: Sparkles },
  returning: { label: "Returning", tone: "neutral", icon: RotateCcw },
  vip: { label: "VIP", tone: "brand", icon: Crown },
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Known status key — resolves label/tone/icon from the registry. Case-insensitive. */
  status?: string;
  /** Explicit label override (or used when no registry entry exists). */
  label?: string;
  /** Explicit tone override. */
  tone?: StatusTone;
  /** Force an icon, or pass false to hide it. */
  icon?: LucideIcon | false;
  size?: "sm" | "md";
}

/**
 * Universal token-driven status pill. Always conveys meaning via text (and an icon),
 * never color alone — so it's fully accessible to color-blind users.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  tone,
  icon,
  size = "md",
  className,
  ...props
}) => {
  const normalizedKey = status ? status.toLowerCase().trim().replace(/[-\s]/g, "_") : undefined;
  const meta = normalizedKey ? STATUS_REGISTRY[normalizedKey] : undefined;
  const resolvedTone = tone ?? meta?.tone ?? "neutral";
  const resolvedLabel =
    label ?? meta?.label ?? (status ? prettify(status) : "—");
  const Icon = icon === false ? null : (icon ?? meta?.icon ?? null);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium ring-1 ring-inset whitespace-nowrap",
        size === "sm"
          ? "px-2 py-0.5 text-[11px]"
          : "px-2.5 py-0.5 text-xs",
        toneClasses[resolvedTone],
        className,
      )}
      {...props}
    >
      {Icon && (
        <Icon
          className={cn(
            size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5",
            (normalizedKey === "processing" || normalizedKey === "in_progress") && "animate-spin",
          )}
          aria-hidden="true"
        />
      )}
      {resolvedLabel}
    </span>
  );
};

const prettify = (s: string) =>
  s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default StatusBadge;
