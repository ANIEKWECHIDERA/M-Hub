// src/routes/company.routes.ts
import { Router } from "express";
import { CompanyController } from "../controllers/company.controller";
import authenticate from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

router.get(
  "/company",
  authenticate,
  authorize(["superAdmin"]),
  CompanyController.getCompany,
);

router.post(
  "/company",
  authenticate,
  // authorize(["superAdmin"]),
  CompanyController.createCompany,
);

router.patch(
  "/company",
  authenticate,
  authorize(["superAdmin"]),
  CompanyController.updateCompany,
);

router.delete(
  "/company",
  authenticate,
  authorize(["superAdmin"]),
  CompanyController.deleteCompany,
);

export default router;
