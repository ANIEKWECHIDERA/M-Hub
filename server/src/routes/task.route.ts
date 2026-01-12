import { Router } from "express";
import { TaskController } from "../controllers/task.controller";
import authenticate from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

// READ (admins + team members)
router.get(
  "/projects/:projectId/tasks",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  TaskController.getTasksByProject
);

router.get(
  "/task/:taskId",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  TaskController.getTaskById
);

// CREATE (admins only)
router.post(
  "/projects/:projectId/tasks",
  authenticate,
  authorize(["admin", "superAdmin"]),
  TaskController.createTask
);

// UPDATE (admins + team members)
router.patch(
  "/task/:taskId",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  TaskController.updateTask
);

// DELETE (admins only)
router.delete(
  "/task/:taskId",
  authenticate,
  authorize(["admin", "superAdmin"]),
  TaskController.deleteTask
);

export default router;
