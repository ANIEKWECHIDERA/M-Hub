import { Router } from "express";
import { TaskController } from "../controllers/task.controller";
import { authorize } from "../middleware/authorize";
import { resolveTeamMember } from "../middleware/resolveTeamMember";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();
const protectedRoute = [verifyFirebaseToken, profileSync, requireAppUser];

// READ (admins + team members)
router.get(
  "/projects/:projectId/tasks",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member"]),
  TaskController.getTasksByProject,
);

router.get(
  "/task/:taskId",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member"]),
  TaskController.getTaskById,
);

router.get(
  "/projects/:projectId/task-stats",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member"]),
  TaskController.getProjectTaskStats,
);

// CREATE (admins only)
router.post(
  "/projects/:projectId/tasks",
  ...protectedRoute,
  authorize(["admin", "superAdmin"]),
  TaskController.createTask,
);

// UPDATE (admins + team members)
router.patch(
  "/task/:taskId",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member"]),
  TaskController.updateTask,
);

// DELETE (admins only)
router.delete(
  "/task/:taskId",
  ...protectedRoute,
  authorize(["admin", "superAdmin"]),
  TaskController.deleteTask,
);

///////// MY TASKS /////////

router.get(
  "/my-tasks",
  ...protectedRoute,
  authorize(["team_member", "admin", "superAdmin"]),
  resolveTeamMember,
  TaskController.getMyTasks,
);

export default router;
