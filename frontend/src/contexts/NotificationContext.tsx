/**
 * NotificationContext — single source of truth for the in-app notification
 * center (bell popover + notifications page).
 *
 * Responsibilities:
 *  - Load the user's notifications + unread count.
 *  - Stay live: subscribe to the `notification:new` Socket.IO event (emitted by
 *    the backend notification service) and prepend new notifications in real
 *    time, bump the unread badge, and raise a toast with a "View" action.
 *  - Expose optimistic mutations: mark read/unread, mark all read, delete,
 *    clear all, and paginated loading.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSocketContext } from "@/contexts/SocketContext";
import { toast } from "@/lib/toast";
import notificationService from "@/services/notificationService";
import type { AppNotification } from "@/types/notification";
import { getNotificationLink } from "@/utils/notificationLink";

const PAGE_SIZE = 20;

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  /** Reload the first page from scratch. */
  refresh: () => Promise<void>;
  /** Append the next page. */
  loadMore: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  loadingMore: false,
  hasMore: false,
  refresh: async () => {},
  loadMore: async () => {},
  markAsRead: async () => {},
  markAsUnread: async () => {},
  markAllAsRead: async () => {},
  remove: async () => {},
  clearAll: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const { socket } = useSocketContext();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const hasMore = page < pages;

  // ── Initial load / reset on auth change ─────────────────────
  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await notificationService.getNotifications(1, PAGE_SIZE);
      if (res.success && res.data) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
        setPage(1);
        setPages(res.data.pagination.pages);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setPage(1);
      setPages(1);
      return;
    }
    void refresh();
  }, [user, refresh]);

  const loadMore = useCallback(async () => {
    if (!user || loadingMore || page >= pages) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await notificationService.getNotifications(next, PAGE_SIZE);
      if (res.success && res.data) {
        setNotifications((prev) => {
          const seen = new Set(prev.map((n) => n._id));
          const merged = [...prev];
          for (const n of res.data!.notifications) {
            if (!seen.has(n._id)) merged.push(n);
          }
          return merged;
        });
        setUnreadCount(res.data.unreadCount);
        setPage(next);
        setPages(res.data.pagination.pages);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [user, loadingMore, page, pages]);

  // ── Real-time: notification:new ─────────────────────────────
  // Keep a ref to the user role for the toast handler without re-subscribing.
  const roleRef = useRef(user?.role);
  roleRef.current = user?.role;

  useEffect(() => {
    if (!socket || !user) return;

    const handler = (notif: AppNotification) => {
      setNotifications((prev) => {
        if (prev.some((n) => n._id === notif._id)) return prev;
        return [notif, ...prev];
      });
      setUnreadCount((c) => c + 1);

      const link = getNotificationLink(notif, roleRef.current);
      const options = {
        description: notif.message,
        ...(link
          ? { action: { label: "View", onClick: () => navigate(link) } }
          : {}),
      };
      switch (notif.type) {
        case "promotion":
          toast.success(notif.title, options);
          break;
        case "order_update":
          toast.info(notif.title, options);
          break;
        default:
          toast.message(notif.title, options);
      }
    };

    socket.on("notification:new", handler);
    return () => {
      socket.off("notification:new", handler);
    };
  }, [socket, user, navigate]);

  // ── Mutations (optimistic) ──────────────────────────────────
  const markAsRead = useCallback(async (id: string) => {
    let wasUnread = false;
    setNotifications((prev) =>
      prev.map((n) => {
        if (n._id === id && !n.isRead) {
          wasUnread = true;
          return { ...n, isRead: true };
        }
        return n;
      }),
    );
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));

    const res = await notificationService.markAsRead(id);
    if (!res.success) {
      // Roll back on failure.
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: false } : n)),
      );
      if (wasUnread) setUnreadCount((c) => c + 1);
      toast.error("Couldn't update notification");
    }
  }, []);

  const markAsUnread = useCallback(async (id: string) => {
    let wasRead = false;
    setNotifications((prev) =>
      prev.map((n) => {
        if (n._id === id && n.isRead) {
          wasRead = true;
          return { ...n, isRead: false };
        }
        return n;
      }),
    );
    if (wasRead) setUnreadCount((c) => c + 1);

    const res = await notificationService.markAsUnread(id);
    if (!res.success) {
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      if (wasRead) setUnreadCount((c) => Math.max(0, c - 1));
      toast.error("Couldn't update notification");
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const snapshot = notifications;
    const prevUnread = unreadCount;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    const res = await notificationService.markAllAsRead();
    if (!res.success) {
      setNotifications(snapshot);
      setUnreadCount(prevUnread);
      toast.error("Couldn't mark all as read");
    }
  }, [notifications, unreadCount]);

  const remove = useCallback(
    async (id: string) => {
      const snapshot = notifications;
      const prevUnread = unreadCount;
      const target = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (target && !target.isRead) setUnreadCount((c) => Math.max(0, c - 1));

      const res = await notificationService.deleteNotification(id);
      if (!res.success) {
        setNotifications(snapshot);
        setUnreadCount(prevUnread);
        toast.error("Couldn't delete notification");
      }
    },
    [notifications, unreadCount],
  );

  const clearAll = useCallback(async () => {
    const snapshot = notifications;
    const prevUnread = unreadCount;
    setNotifications([]);
    setUnreadCount(0);

    const res = await notificationService.clearAll();
    if (!res.success) {
      setNotifications(snapshot);
      setUnreadCount(prevUnread);
      toast.error("Couldn't clear notifications");
    }
  }, [notifications, unreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        loadingMore,
        hasMore,
        refresh,
        loadMore,
        markAsRead,
        markAsUnread,
        markAllAsRead,
        remove,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
