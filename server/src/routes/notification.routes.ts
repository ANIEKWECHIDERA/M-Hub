import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";
import { authorize } from "../middleware/authorize";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();
router.use(verifyFirebaseToken);
router.use(profileSync);
router.use(requireAppUser);

// READ
router.get(
  "/notifications",
  authorize(["admin", "superAdmin", "team_member"]),
  NotificationController.getMyNotifications,
);

// MARK AS READ
router.patch(
  "/notifications/:id/read",
  authorize(["admin", "superAdmin", "team_member"]),
  NotificationController.markNotificationRead,
);

export default router;
