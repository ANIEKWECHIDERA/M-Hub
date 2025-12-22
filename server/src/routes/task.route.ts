import { Router } from "express";
import { TaskController } from "../controllers/task.controller";
import authenticate from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

// READ (admins + team members)
router.get(
  "/task",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  TaskController.getTasks
);

router.get(
  "/task/:id",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  TaskController.getTask
);

// CREATE (admins only)
router.post(
  "/task",
  authenticate,
  authorize(["admin", "superAdmin"]),
  TaskController.createTask
);

// UPDATE (admins + team members)
router.patch(
  "/task/:id",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  TaskController.updateTask
);

// DELETE (admins only)
router.delete(
  "/task/:id",
  authenticate,
  authorize(["admin", "superAdmin"]),
  TaskController.deleteTask
);

export default router;
