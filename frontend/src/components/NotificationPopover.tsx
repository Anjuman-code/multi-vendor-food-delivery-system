import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { typeConfig, formatRelativeTime } from "@/components/notifications/shared";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import type { AppNotification } from "@/types/notification";
import { getNotificationLink } from "@/utils/notificationLink";
import { cn } from "@/utils/cn";

type Filter = "all" | "unread";

const NotificationPopover: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    remove,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(
    () =>
      filter === "unread"
        ? notifications.filter((n) => !n.isRead)
        : notifications,
    [notifications, filter],
  );

  if (!user) return null;

  const handleOpen = (notif: AppNotification) => {
    if (!notif.isRead) void markAsRead(notif._id);
    const link = getNotificationLink(notif, user.role);
    setOpen(false);
    if (link) navigate(link);
  };

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
            <span className="absolute -top-0.5 -right-0.5 min-w-[1.15rem] h-[1.15rem] px-1 bg-gradient-to-r from-brand-500 to-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[22rem] sm:w-[26rem] p-0 bg-white overflow-hidden"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-brand-600 hover:text-brand-700 hover:bg-brand-50"
                onClick={() => void markAllAsRead()}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="mt-2 flex items-center gap-1">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  filter === f
                    ? "bg-brand-100 text-brand-700"
                    : "text-gray-500 hover:bg-gray-100",
                )}
              >
                {f === "all" ? "All" : `Unread${unreadCount ? ` (${unreadCount})` : ""}`}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto max-h-[22rem]">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <BellOff className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">
                {filter === "unread"
                  ? "You're all caught up"
                  : "No notifications yet"}
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {visible.map((notif) => {
                const cfg = typeConfig(notif.type);
                const { Icon } = cfg;
                return (
                  <motion.div
                    key={notif._id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className={cn(
                      "group relative px-4 py-3 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0",
                      notif.isRead
                        ? "hover:bg-gray-50"
                        : "bg-brand-50/40 hover:bg-brand-50/80",
                    )}
                    onClick={() => handleOpen(notif)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                          cfg.chip,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {notif.title}
                          </p>
                          {!notif.isRead && (
                            <span className="h-2 w-2 rounded-full bg-brand-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
                          {notif.message}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          {formatRelativeTime(notif.createdAt)}
                        </p>
                      </div>

                      {/* Hover actions */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.isRead && (
                          <button
                            type="button"
                            title="Mark as read"
                            className="p-1 rounded-md text-gray-400 hover:text-brand-600 hover:bg-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              void markAsRead(notif._id);
                            }}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Delete"
                          className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            void remove(notif._id);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-gray-100 p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-xs text-gray-600 hover:text-gray-900"
              onClick={() => {
                setOpen(false);
                navigate("/notifications");
              }}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationPopover;
