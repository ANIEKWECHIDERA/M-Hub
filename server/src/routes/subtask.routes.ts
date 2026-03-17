import { Router } from "express";
import { SubtaskController } from "../controllers/subtask.controller";
import { authorize } from "../middleware/authorize";
import { resolveTeamMember } from "../middleware/resolveTeamMember";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();
const protectedRoute = [verifyFirebaseToken, profileSync, requireAppUser];

// READ
router.get(
  "/subtask",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member"]),
  resolveTeamMember,
  SubtaskController.getSubtasks,
);

router.get(
  "/subtask/:id",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member"]),
  resolveTeamMember,
  SubtaskController.getSubtask,
);

// CREATE
router.post(
  "/subtask",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member"]),
  resolveTeamMember,
  SubtaskController.createSubtask,
);

// UPDATE
router.patch(
  "/subtask/:id",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member"]),
  resolveTeamMember,
  SubtaskController.updateSubtask,
);

// DELETE
router.delete(
  "/subtask/:id",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member"]),
  resolveTeamMember,
  SubtaskController.deleteSubtask,
);

export default router;
