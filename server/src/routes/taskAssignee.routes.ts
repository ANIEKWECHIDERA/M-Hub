import { Router } from "express";
import { TaskAssigneeController } from "../controllers/taskAssignee.controller";
import authenticate from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

router.get(
  "/task-assignees",
  authenticate,
  authorize(["team_member", "admin", "superAdmin"]),
  TaskAssigneeController.getAll
);

router.get(
  "/task-assignees/:id",
  authenticate,
  authorize(["team_member", "admin", "superAdmin"]),
  TaskAssigneeController.getById
);

router.post(
  "/task-assignees",
  authenticate,
  authorize(["admin", "superAdmin"]),
  TaskAssigneeController.create
);

router.post(
  "/task-assignees/bulk",
  authenticate,
  authorize(["admin", "superAdmin"]),
  TaskAssigneeController.bulkAssign
);

router.delete(
  "/task-assignees/:id",
  authenticate,
  authorize(["admin", "superAdmin"]),
  TaskAssigneeController.delete
);

export default router;
