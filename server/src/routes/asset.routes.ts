import { Router } from "express";
import { AssetController } from "../controllers/asset.controller";
import authenticate from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { upload } from "../middleware/upload";

const router = Router();

router.post(
  "/assets/upload",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  upload.array("files", 5),
  AssetController.upload
);

// router.get(
//   "/assets",
//   authenticate,
//   authorize(["admin", "superAdmin", "team_member"]),
//   AssetController.getAll
// );

// router.get(
//   "/assets/:id",
//   authenticate,
//   authorize(["admin", "superAdmin", "team_member"]),
//   AssetController.getById
// );

router.get(
  "/assets/:projectId",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  AssetController.getByProject
);

router.delete(
  "/assets/:id",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  AssetController.delete
);
export default router;
