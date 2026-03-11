/**
 * NotificationsPage – notification inbox with read/unread, mark-all-read.
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BellOff,
  CheckCheck,
  Loader2,
  Package,
  Megaphone,
  Info,
  MessageSquare,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useToast } from "../hooks/use-toast";
import notificationService from "../services/notificationService";
import type { AppNotification, NotificationType } from "../types/notification";

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ReactNode; color: string }
> = {
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

const fmtRelative = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
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
  }).format(new Date(d));
};

const NotificationsPage: React.FC = () => {
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const res = await notificationService.getNotifications(page, 20);
    if (res.success && res.data) {
      setNotifications(res.data.notifications);
      setTotalPages(res.data.pagination.pages);
      setUnreadCount(res.data.unreadCount);
    } else {
      toast({
        title: "Error",
        description: res.message || "Failed to load notifications.",
        variant: "destructive",
      });
    }
    setLoading(false);
  }, [page, toast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = async (notifId: string) => {
    const res = await notificationService.markAsRead(notifId);
    if (res.success) {
      setNotifications((prev) =>
        prev.map((n) => (n._id === notifId ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  };

  const markAllRead = async () => {
    const res = await notificationService.markAllAsRead();
    if (res.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast({ title: "All marked as read" });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              <CheckCheck className="mr-1 h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : notifications.length === 0 ? (
          <Card className="p-10 text-center">
            <BellOff className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-semibold text-gray-700 mb-1">
              No notifications
            </h2>
            <p className="text-sm text-gray-500">
              You're all caught up! Check back later.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {notifications.map((notif) => {
                const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
                return (
                  <motion.div
                    key={notif._id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Card
                      className={`p-4 cursor-pointer transition-colors ${
                        notif.isRead
                          ? "bg-white"
                          : "bg-orange-50/50 border-orange-100"
                      }`}
                      onClick={() => !notif.isRead && markRead(notif._id)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.color}`}
                        >
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {notif.title}
                            </p>
                            {!notif.isRead && (
                              <span className="h-2 w-2 rounded-full bg-orange-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {fmtRelative(notif.createdAt)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>
            <span className="flex items-center text-sm text-gray-600 px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default NotificationsPage;
