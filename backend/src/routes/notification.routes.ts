/**
 * Notification routes – authenticated user notifications.
 */
import { Router } from "express";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  deleteNotification,
  clearAll,
} from "../controllers/notification.controller";
import { authenticate } from "../middleware/auth.middleware";

const router: Router = Router();

router.use(authenticate);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);
router.patch("/:notificationId/read", markAsRead);
router.patch("/:notificationId/unread", markAsUnread);
router.delete("/:notificationId", deleteNotification);
router.delete("/", clearAll);

export default router;
