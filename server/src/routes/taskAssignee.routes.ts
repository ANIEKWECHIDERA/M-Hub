import { Router } from "express";
import { TaskAssigneeController } from "../controllers/taskAssignee.controller";
import { authorize } from "../middleware/authorize";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();
const protectedRoute = [verifyFirebaseToken, profileSync, requireAppUser];

router.get(
  "/task-assignees",
  ...protectedRoute,
  authorize(["team_member", "admin", "superAdmin"]),
  TaskAssigneeController.getAll,
);

router.get(
  "/task-assignees/:id",
  ...protectedRoute,
  authorize(["team_member", "admin", "superAdmin"]),
  TaskAssigneeController.getById,
);

router.post(
  "/task-assignees",
  ...protectedRoute,
  authorize(["admin", "superAdmin"]),
  TaskAssigneeController.create,
);

router.post(
  "/task-assignees/bulk",
  ...protectedRoute,
  authorize(["admin", "superAdmin"]),
  TaskAssigneeController.bulkAssign,
);

router.delete(
  "/task-assignees/:id",
  ...protectedRoute,
  authorize(["admin", "superAdmin"]),
  TaskAssigneeController.delete,
);

export default router;
