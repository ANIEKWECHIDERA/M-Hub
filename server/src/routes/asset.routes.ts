import { Router } from "express";
import { AssetController } from "../controllers/asset.controller";
import { authorize } from "../middleware/authorize";
import { upload } from "../middleware/upload";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();
router.use(verifyFirebaseToken);
router.use(profileSync);
router.use(requireAppUser);

router.post(
  "/assets/upload",
  authorize(["admin", "superAdmin", "team_member"]),
  upload.array("files", 5),
  AssetController.upload,
);

router.get(
  "/assets/:projectId",
  authorize(["admin", "superAdmin", "team_member"]),
  AssetController.getByProject,
);

router.delete(
  "/assets/:id",
  authorize(["admin", "superAdmin", "team_member"]),
  AssetController.delete,
);
export default router;
