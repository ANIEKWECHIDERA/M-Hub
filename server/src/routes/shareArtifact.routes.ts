import { Router } from "express";
import { ShareArtifactController } from "../controllers/shareArtifact.controller";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";
import { authorize } from "../middleware/authorize";

const router = Router();

router.get(
  "/share/decision-timeline",
  verifyFirebaseToken,
  profileSync,
  requireAppUser,
  authorize(["admin", "superAdmin", "team_member", "member"]),
  ShareArtifactController.decisionTimeline,
);

router.get(
  "/share/workspace-snapshot",
  verifyFirebaseToken,
  profileSync,
  requireAppUser,
  authorize(["admin", "superAdmin"]),
  ShareArtifactController.workspaceSnapshot,
);

export default router;
