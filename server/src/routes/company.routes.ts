// src/routes/company.routes.ts
import { Router } from "express";
import { CompanyController } from "../controllers/company.controller";
import authenticate from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get(
  "/company",
  verifyFirebaseToken,
  profileSync,
  requireAppUser,
  authorize(["superAdmin"]),
  CompanyController.getCompany,
);

router.post(
  "/company",
  verifyFirebaseToken,
  profileSync,
  upload.single("logo"),
  // authorize(["superAdmin"]),
  CompanyController.createCompany,
);

router.patch(
  "/company",
  verifyFirebaseToken,
  profileSync,
  requireAppUser,
  authorize(["superAdmin"]),
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
