import { Router } from "express";
import { TaskController } from "../controllers/task.controller";
import authenticate from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { resolve } from "path";
import { resolveTeamMember } from "../middleware/resolveTeamMember";

const router = Router();

// READ (admins + team members)
router.get(
  "/projects/:projectId/tasks",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  TaskController.getTasksByProject,
);

router.get(
  "/task/:taskId",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  TaskController.getTaskById,
);

router.get(
  "/projects/:projectId/task-stats",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  TaskController.getProjectTaskStats,
);

// CREATE (admins only)
router.post(
  "/projects/:projectId/tasks",
  authenticate,
  authorize(["admin", "superAdmin"]),
  TaskController.createTask,
);

// UPDATE (admins + team members)
router.patch(
  "/task/:taskId",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  TaskController.updateTask,
);

// DELETE (admins only)
router.delete(
  "/task/:taskId",
  authenticate,
  authorize(["admin", "superAdmin"]),
  TaskController.deleteTask,
);

///////// MY TASKS /////////

router.get(
  "/my-tasks",
  authenticate,
  authorize(["team_member", "admin", "superAdmin"]),
  resolveTeamMember,
  TaskController.getMyTasks,
);

export default router;
