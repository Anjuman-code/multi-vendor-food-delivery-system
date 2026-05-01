import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BellOff,
  CheckCheck,
  Info,
  Loader2,
  Megaphone,
  MessageSquare,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useSocketContext } from "@/contexts/SocketContext";
import { useToast } from "@/hooks/use-toast";
import notificationService from "@/services/notificationService";
import type { AppNotification, NotificationType } from "@/types/notification";
import { cn } from "@/utils/cn";

// ── Icon/colour map per notification type ───────────────────────

const TYPE_CONFIG: Record<NotificationType, { icon: React.ReactNode; color: string }> = {
  order_update: {
    icon: <Package className="h-4 w-4" />,
    color: "bg-blue-100 text-blue-600",
  },
  promotion: {
    icon: <Megaphone className="h-4 w-4" />,
    color: "bg-green-100 text-green-600",
  },
  system: {
    icon: <Info className="h-4 w-4" />,
    color: "bg-gray-100 text-gray-600",
  },
  review_reply: {
    icon: <MessageSquare className="h-4 w-4" />,
    color: "bg-purple-100 text-purple-600",
  },
};

// ── Relative time helper ────────────────────────────────────────

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(iso),
  );
}

// ── Component ───────────────────────────────────────────────────

const NotificationPopover: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocketContext();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // ── Fetch notifications when popover opens ──────────────────

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await notificationService.getNotifications(1, 10);
      if (res.success && res.data) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load notifications.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // ── Listen for real-time notifications via Socket.IO ────────

  useEffect(() => {
    if (!socket || !user) return;

    if (user.role === "vendor") {
      const handler = (data: {
        _id: string;
        orderNumber: string;
        customerName: string;
        total: number;
      }) => {
        const newNotif: AppNotification = {
          _id: `new-${data._id}-${Date.now()}`,
          userId: user.id ?? "",
          type: "order_update",
          title: "New Order!",
          message: `${data.orderNumber} · ${data.customerName} · ৳${data.total.toLocaleString("en-BD")}`,
          isRead: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          data: { orderId: data._id },
        };
        setNotifications((prev) => [newNotif, ...prev].slice(0, 10));
        setUnreadCount((c) => c + 1);
      };
      socket.on("newOrder", handler);
      return () => {
        socket.off("newOrder", handler);
      };
    }

    if (user.role === "customer") {
      const handler = (data: {
        _id: string;
        orderNumber: string;
        newStatus: string;
      }) => {
        const labelMap: Record<string, string> = {
          pending: "Pending",
          confirmed: "Confirmed",
          preparing: "Preparing",
          ready: "Ready for Pickup",
          picked_up: "Picked Up",
          delivered: "Delivered",
          cancelled: "Cancelled",
        };
        const label = labelMap[data.newStatus] ?? data.newStatus;
        const newNotif: AppNotification = {
          _id: `status-${data._id}-${Date.now()}`,
          userId: user.id ?? "",
          type: "order_update",
          title: "Order Update",
          message: `Order ${data.orderNumber} is now ${label}.`,
          isRead: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          data: { orderId: data._id, status: data.newStatus },
        };
        setNotifications((prev) => [newNotif, ...prev].slice(0, 10));
        setUnreadCount((c) => c + 1);
      };
      socket.on("orderStatusUpdate", handler);
      return () => {
        socket.off("orderStatusUpdate", handler);
      };
    }
  }, [socket, user, toast]);

  // ── Mark single notification as read ────────────────────────

  const markAsRead = async (notifId: string) => {
    // Optimistic update for local-only notifications (prepended via socket)
    if (notifId.startsWith("new-") || notifId.startsWith("status-")) {
      setNotifications((prev) =>
        prev.map((n) => (n._id === notifId ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      return;
    }

    try {
      const res = await notificationService.markAsRead(notifId);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === notifId ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to mark notification as read.",
        variant: "destructive",
      });
    }
  };

  // ── Mark all as read ────────────────────────────────────────

  const markAllAsRead = async () => {
    try {
      const res = await notificationService.markAllAsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read.",
        variant: "destructive",
      });
    }
  };

  // ── Render ──────────────────────────────────────────────────

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 sm:w-96 p-0 bg-white" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Body */}
        <div className="overflow-y-auto max-h-80">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <BellOff className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No notifications yet</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {notifications.map((notif) => {
                const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;
                return (
                  <motion.div
                    key={notif._id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "px-4 py-3 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0",
                      notif.isRead
                        ? "hover:bg-gray-50"
                        : "bg-orange-50/40 hover:bg-orange-50/80",
                    )}
                    onClick={() => {
                      if (!notif.isRead) markAsRead(notif._id);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Type icon */}
                      <div
                        className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                          cfg.color,
                        )}
                      >
                        {cfg.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {notif.title}
                          </p>
                          {!notif.isRead && (
                            <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
                          {notif.message}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          {fmtRelative(notif.createdAt)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationPopover;
