import { Router } from "express";
import { ProjectController } from "../controllers/project.controller";
import { authorize } from "../middleware/authorize";

import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();
const protectedRoute = [verifyFirebaseToken, profileSync, requireAppUser];
// READ (admins + team members)
router.get(
  "/project",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member"]),
  ProjectController.getProjects,
);

router.get(
  "/project/:id",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member"]),
  ProjectController.getProject,
);

// CREATE (admins only)
router.post(
  "/project",
  ...protectedRoute,
  authorize(["admin", "superAdmin"]),
  ProjectController.createProject,
);

// UPDATE (admins + team members)
router.patch(
  "/project/:id",
  ...protectedRoute,
  authorize(["admin", "superAdmin"]),
  ProjectController.updateProject,
);

// DELETE (admins only)
router.delete(
  "/project/:id",
  ...protectedRoute,
  authorize(["admin", "superAdmin"]),
  ProjectController.deleteProject,
);

export default router;
