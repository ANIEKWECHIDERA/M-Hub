import { Router } from "express";
import { InviteController } from "../controllers/invite.controller";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { authorize } from "../middleware/authorize";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();

router.post(
  "/invite",
  verifyFirebaseToken,
  profileSync,
  requireAppUser,
  authorize(["admin", "superAdmin"]),
  InviteController.sendInvite,
);

router.post("/invite/accept", InviteController.acceptInvite);

router.get(
  "/invites",
  verifyFirebaseToken,
  profileSync,
  requireAppUser,
  authorize(["superAdmin"]),
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
