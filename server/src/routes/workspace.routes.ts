import { Router } from "express";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { workspaceSwitchLimiter } from "../middleware/rateLimiter";
import { WorkspaceController } from "../controllers/workspace.controller";
import { requireAppUser } from "../middleware/requireAppUser.middleware";
import { authorize } from "../middleware/authorize";

const router = Router();

router.get(
  "/workspaces",
  verifyFirebaseToken,
  profileSync,
  WorkspaceController.list,
);

router.post(
  "/workspaces/switch",
  verifyFirebaseToken,
  profileSync,
  workspaceSwitchLimiter,
  WorkspaceController.switch,
);

router.get(
  "/workspaces/manager",
  verifyFirebaseToken,
  profileSync,
  requireAppUser,
  authorize(["admin", "superAdmin"]),
  WorkspaceController.manager,
);

export default router;
