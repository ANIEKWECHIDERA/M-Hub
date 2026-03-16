import { Router } from "express";
import { InviteController } from "../controllers/invite.controller";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { authorize } from "../middleware/authorize";
import { requireAppUser } from "../middleware/requireAppUser.middleware";
import { inviteLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post(
  "/invite",
  inviteLimiter,
  verifyFirebaseToken,
  profileSync,
  requireAppUser,
  authorize(["admin", "superAdmin"]),
  InviteController.sendInvite,
);

router.post(
  "/invite/accept",
  inviteLimiter,
  verifyFirebaseToken,
  profileSync,
  InviteController.acceptInvite,
);

router.post("/invite/decline", inviteLimiter, InviteController.declineInvite);

router.get(
  "/invites",
  verifyFirebaseToken,
  profileSync,
  requireAppUser,
  authorize(["admin", "superAdmin"]),
  InviteController.getInvites,
);

router.delete(
  "/invite/:inviteId",
  verifyFirebaseToken,
  profileSync,
  requireAppUser,
  authorize(["admin", "superAdmin"]),
  InviteController.cancelInvite,
);

router.delete(
  "/invites",
  verifyFirebaseToken,
  profileSync,
  requireAppUser,
  authorize(["admin", "superAdmin"]),
  InviteController.cancelInvites,
);

export default router;
