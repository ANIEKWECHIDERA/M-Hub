import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";
import authenticate from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

// READ
router.get(
  "/notifications",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  NotificationController.getMyNotifications
);

// MARK AS READ
router.patch(
  "/notifications/:id/read",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  NotificationController.markNotificationRead
);

export default router;
