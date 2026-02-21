import { Router } from "express";
import { TaskController } from "../controllers/task.controller";
import { authorize } from "../middleware/authorize";
import { resolveTeamMember } from "../middleware/resolveTeamMember";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();
router.use(verifyFirebaseToken);
router.use(profileSync);
router.use(requireAppUser);

// READ (admins + team members)
router.get(
  "/projects/:projectId/tasks",
  authorize(["admin", "superAdmin", "team_member"]),
  TaskController.getTasksByProject,
);

router.get(
  "/task/:taskId",
  authorize(["admin", "superAdmin", "team_member"]),
  TaskController.getTaskById,
);

router.get(
  "/projects/:projectId/task-stats",
  authorize(["admin", "superAdmin", "team_member"]),
  TaskController.getProjectTaskStats,
);

// CREATE (admins only)
router.post(
  "/projects/:projectId/tasks",
  authorize(["admin", "superAdmin"]),
  TaskController.createTask,
);

// UPDATE (admins + team members)
router.patch(
  "/task/:taskId",
  authorize(["admin", "superAdmin", "team_member"]),
  TaskController.updateTask,
);

// DELETE (admins only)
router.delete(
  "/task/:taskId",
  authorize(["admin", "superAdmin"]),
  TaskController.deleteTask,
);

///////// MY TASKS /////////

router.get(
  "/my-tasks",
  authorize(["team_member", "admin", "superAdmin"]),
  resolveTeamMember,
  TaskController.getMyTasks,
);

export default router;
