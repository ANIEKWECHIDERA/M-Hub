import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";
import { authorize } from "../middleware/authorize";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();
const protectedRoute = [verifyFirebaseToken, profileSync, requireAppUser];

router.get("/notifications/stream", NotificationController.streamNotifications);

router.get(
  "/notifications",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member"]),
  NotificationController.getMyNotifications,
);

router.get(
  "/notifications/unread-count",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member"]),
  NotificationController.getUnreadCount,
);

router.patch(
  "/notifications/:id/read",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member"]),
  NotificationController.markNotificationRead,
);

router.patch(
  "/notifications/read-all",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member"]),
  NotificationController.markAllNotificationsRead,
);

router.delete(
  "/notifications/:id",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member"]),
  NotificationController.clearNotification,
);

router.delete(
  "/notifications",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member"]),
  NotificationController.clearAllNotifications,
);

export default router;
