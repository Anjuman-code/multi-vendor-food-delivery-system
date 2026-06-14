/**
 * NotificationsPage – full notification inbox.
 *
 * Backed by the shared NotificationContext (live updates), with all/unread
 * filtering, date grouping, deep-link navigation, and per-item actions
 * (mark read/unread, delete) plus mark-all-read / clear-all and "load more".
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BellOff,
  Check,
  CheckCheck,
  Loader2,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  typeConfig,
  formatRelativeTime,
  dateGroup,
} from "@/components/notifications/shared";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import type { AppNotification } from "@/types/notification";
import { getNotificationLink } from "@/utils/notificationLink";
import { cn } from "@/utils/cn";

type Filter = "all" | "unread";
const GROUP_ORDER = ["Today", "Yesterday", "Earlier"] as const;

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    remove,
    clearAll,
  } = useNotifications();

  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(
    () =>
      filter === "unread"
        ? notifications.filter((n) => !n.isRead)
        : notifications,
    [notifications, filter],
  );

  const grouped = useMemo(() => {
    const map: Record<string, AppNotification[]> = {};
    for (const n of visible) {
      const g = dateGroup(n.createdAt);
      (map[g] ??= []).push(n);
    }
    return map;
  }, [visible]);

  const openNotification = (notif: AppNotification) => {
    if (!notif.isRead) void markAsRead(notif._id);
    const link = getNotificationLink(notif, user?.role);
    if (link) navigate(link);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="text-xs bg-brand-500 text-white px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => void markAllAsRead()}>
                <CheckCheck className="mr-1 h-4 w-4" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-red-600"
                onClick={() => void clearAll()}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-4">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors",
                filter === f
                  ? "bg-brand-100 text-brand-700"
                  : "text-gray-500 hover:bg-gray-100",
              )}
            >
              {f === "all" ? "All" : `Unread${unreadCount ? ` (${unreadCount})` : ""}`}
            </button>
          ))}
        </div>

        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          </div>
        ) : visible.length === 0 ? (
          <Card className="p-10 text-center">
            <BellOff className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-semibold text-gray-700 mb-1">
              {filter === "unread" ? "No unread notifications" : "No notifications"}
            </h2>
            <p className="text-sm text-gray-500">
              You're all caught up! Check back later.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {GROUP_ORDER.filter((g) => grouped[g]?.length).map((group) => (
              <div key={group}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 px-1">
                  {group}
                </h3>
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {grouped[group].map((notif) => {
                      const cfg = typeConfig(notif.type);
                      const { Icon } = cfg;
                      return (
                        <motion.div
                          key={notif._id}
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        >
                          <Card
                            className={cn(
                              "group p-4 cursor-pointer transition-colors",
                              notif.isRead
                                ? "bg-white hover:bg-gray-50"
                                : "bg-brand-50/50 border-brand-100 hover:bg-brand-50",
                            )}
                            onClick={() => openNotification(notif)}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  "h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0",
                                  cfg.chip,
                                )}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="font-medium text-gray-900 text-sm truncate">
                                    {notif.title}
                                  </p>
                                  {!notif.isRead && (
                                    <span className="h-2 w-2 rounded-full bg-brand-500 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {notif.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {formatRelativeTime(notif.createdAt)}
                                </p>
                              </div>

                              {/* Hover actions */}
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  title={notif.isRead ? "Mark as unread" : "Mark as read"}
                                  className="p-1.5 rounded-md text-gray-400 hover:text-brand-600 hover:bg-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (notif.isRead) void markAsUnread(notif._id);
                                    else void markAsRead(notif._id);
                                  }}
                                >
                                  {notif.isRead ? (
                                    <Undo2 className="h-4 w-4" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  title="Delete"
                                  className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void remove(notif._id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {filter === "all" && hasMore && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Load more
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default NotificationsPage;
