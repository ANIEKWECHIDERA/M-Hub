import { Router } from "express";
import { ProjectController } from "../controllers/project.controller";
import authenticate from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

// READ (admins + team members)
router.get(
  "/project",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  ProjectController.getProjects
);

router.get(
  "/project/:id",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  ProjectController.getProject
);

// CREATE (admins only)
router.post(
  "/project",
  authenticate,
  authorize(["admin", "superAdmin"]),
  ProjectController.createProject
);

// UPDATE (admins + team members)
router.patch(
  "/project/:id",
  authenticate,
  authorize(["admin", "superAdmin"]),
  ProjectController.updateProject
);

// DELETE (admins only)
router.delete(
  "/project/:id",
  authenticate,
  authorize(["admin", "superAdmin"]),
  ProjectController.deleteProject
);

export default router;
