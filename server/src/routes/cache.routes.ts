import { Router } from "express";
import { CacheController } from "../controllers/cache.controller";
import { authorize } from "../middleware/authorize";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";

const router = Router();

router.get(
  "/cache-metrics",
  verifyFirebaseToken,
  profileSync,
  requireAppUser,
  authorize(["admin", "superAdmin"]),
  CacheController.getMetrics,
);

export default router;
