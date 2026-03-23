// src/routes/company.routes.ts
import { Router } from "express";
import { CompanyController } from "../controllers/company.controller";
import { authorize } from "../middleware/authorize";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";
import multer from "multer";

const router = Router();
const allowedWorkspaceLogoMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, callback) => {
    if (!allowedWorkspaceLogoMimeTypes.has(file.mimetype)) {
      callback(new Error("Only JPG, PNG, WebP, or SVG workspace logos are allowed."));
      return;
    }

    callback(null, true);
  },
});

router.get(
  "/company",
  verifyFirebaseToken,
  profileSync,
  requireAppUser,
  authorize(["admin", "superAdmin"]),
  CompanyController.getCompany,
);

router.post(
  "/company",
  verifyFirebaseToken,
  profileSync,
  upload.single("logo"),
  CompanyController.createCompany,
);

router.patch(
  "/company",
  verifyFirebaseToken,
  profileSync,
  requireAppUser,
  authorize(["superAdmin"]),
  upload.single("logo"),
  CompanyController.updateCompany,
);

router.delete(
  "/company",
  verifyFirebaseToken,
  profileSync,
  requireAppUser,
  authorize(["superAdmin"]),
  CompanyController.deleteCompany,
);

export default router;
