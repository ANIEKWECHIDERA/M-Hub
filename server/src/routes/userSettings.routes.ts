import { Router } from "express";
import { UserSettingsController } from "../controllers/userSettings.controller";
import authenticate from "../middleware/authenticate";

const router = Router();

// READ my settings
router.get(
  "/user/settings",
  authenticate,
  UserSettingsController.getMySettings
);

// UPDATE my settings
router.patch(
  "/user/settings",
  authenticate,
  UserSettingsController.updateMySettings
);

export default router;
