import { Router } from "express";
import { ProjectController } from "../controllers/project.controller";
import authenticate from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

router.get("/project", authenticate, ProjectController.getProjects);
router.get("/project/:id", authenticate, ProjectController.getProject);

router.post(
  "/project",
  authenticate,
  authorize(["admin", "superAdmin"]),
  ProjectController.createProject
);

router.patch(
  "/project/:id",
  authenticate,
  authorize(["admin", "superAdmin"]),
  ProjectController.updateProject
);

router.delete(
  "/project/:id",
  authenticate,
  authorize(["admin", "superAdmin"]),
  ProjectController.deleteProject
);

export default router;
