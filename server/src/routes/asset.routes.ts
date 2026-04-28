import { Router } from "express";
import { AssetController } from "../controllers/asset.controller";
import { authorize } from "../middleware/authorize";
import { assetUpload } from "../middleware/upload";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();
const protectedRoute = [verifyFirebaseToken, profileSync, requireAppUser];

router.post(
  "/assets/upload",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member"]),
  assetUpload.array("files", 5),
  AssetController.upload,
);

router.get(
  "/assets/:projectId",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member"]),
  AssetController.getByProject,
);

router.delete(
  "/assets/:id",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member"]),
  AssetController.delete,
);
export default router;
