import { Router } from "express";
import { UserSettingsController } from "../controllers/userSettings.controller";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();
router.use(verifyFirebaseToken);
router.use(profileSync);
router.use(requireAppUser);

// READ my settings
router.get("/user/settings", UserSettingsController.getMySettings);

// UPDATE my settings
router.patch("/user/settings", UserSettingsController.updateMySettings);

export default router;
