import { Router } from "express";
import { UserSettingsController } from "../controllers/userSettings.controller";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();
const protectedRoute = [verifyFirebaseToken, profileSync, requireAppUser];

// READ my settings
router.get("/user/settings", ...protectedRoute, UserSettingsController.getMySettings);

// UPDATE my settings
router.patch("/user/settings", ...protectedRoute, UserSettingsController.updateMySettings);

export default router;
