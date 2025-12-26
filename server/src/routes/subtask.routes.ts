import { Router } from "express";
import { SubtaskController } from "../controllers/subtask.controller";
import authenticate from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

// READ
router.get(
  "/subtask",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  SubtaskController.getSubtasks
);

router.get(
  "/subtask/:id",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  SubtaskController.getSubtask
);

// CREATE
router.post(
  "/subtask",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  SubtaskController.createSubtask
);

// UPDATE
router.patch(
  "/subtask/:id",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  SubtaskController.updateSubtask
);

// DELETE
router.delete(
  "/subtask/:id",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  SubtaskController.deleteSubtask
);

export default router;
