import { Router } from "express";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { workspaceSwitchLimiter } from "../middleware/rateLimiter";
import { WorkspaceController } from "../controllers/workspace.controller";

const router = Router();

router.get(
  "/workspaces",
  verifyFirebaseToken,
  profileSync,
  WorkspaceController.list,
);

router.post(
  "/workspaces/switch",
  workspaceSwitchLimiter,
  verifyFirebaseToken,
  profileSync,
  WorkspaceController.switch,
);

export default router;
