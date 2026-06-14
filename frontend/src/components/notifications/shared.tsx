/**
 * Shared presentation helpers for the notification center (popover + page).
 */
import {
  Info,
  Megaphone,
  MessageSquare,
  Package,
  type LucideIcon,
} from "lucide-react";
import type { NotificationType } from "@/types/notification";

export interface TypeConfig {
  Icon: LucideIcon;
  /** Tailwind classes for the icon chip (bg + text). */
  chip: string;
  label: string;
}

export const TYPE_CONFIG: Record<NotificationType, TypeConfig> = {
  order_update: {
    Icon: Package,
    chip: "bg-blue-100 text-blue-600",
    label: "Order",
  },
  promotion: {
    Icon: Megaphone,
    chip: "bg-green-100 text-green-600",
    label: "Promotion",
  },
  system: {
    Icon: Info,
    chip: "bg-gray-100 text-gray-600",
    label: "System",
  },
  review_reply: {
    Icon: MessageSquare,
    chip: "bg-purple-100 text-purple-600",
    label: "Review",
  },
};

export function typeConfig(type: NotificationType): TypeConfig {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.system;
}

/** Compact relative time, e.g. "Just now", "5m ago", "3d ago", "Apr 12". */
export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

/** Group label for a notification timestamp ("Today", "Yesterday", "Earlier"). */
export function dateGroup(iso: string): "Today" | "Yesterday" | "Earlier" {
  const now = new Date();
  const date = new Date(iso);
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const ts = date.getTime();
  if (ts >= startOfToday) return "Today";
  if (ts >= startOfToday - 86_400_000) return "Yesterday";
  return "Earlier";
}
