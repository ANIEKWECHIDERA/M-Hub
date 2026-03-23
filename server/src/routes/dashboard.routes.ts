import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";
import { authorize } from "../middleware/authorize";

const router = Router();

router.get(
  "/dashboard/retention",
  verifyFirebaseToken,
  profileSync,
  requireAppUser,
  authorize(["admin", "superAdmin", "team_member", "member"]),
  DashboardController.retention,
);

export default router;
