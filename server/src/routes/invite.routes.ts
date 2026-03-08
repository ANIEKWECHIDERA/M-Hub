import { Router } from "express";
import { InviteController } from "../controllers/invite.controller";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { authorize } from "../middleware/authorize";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();

router.post(
  "/send-invite",
  verifyFirebaseToken,
  profileSync,
  requireAppUser,
  authorize(["admin", "superAdmin"]),
  InviteController.sendInvite,
);
router.post("/accept-invite", InviteController.acceptInvite);

export default router;
