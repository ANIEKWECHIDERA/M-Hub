import { Router } from "express";
import { SubtaskController } from "../controllers/subtask.controller";
import { authorize } from "../middleware/authorize";
import { resolveTeamMember } from "../middleware/resolveTeamMember";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();
router.use(verifyFirebaseToken);
router.use(profileSync);
router.use(requireAppUser);

// READ
router.get(
  "/subtask",
  authorize(["admin", "superAdmin", "team_member"]),
  resolveTeamMember,
  SubtaskController.getSubtasks,
);

router.get(
  "/subtask/:id",
  authorize(["admin", "superAdmin", "team_member"]),
  resolveTeamMember,
  SubtaskController.getSubtask,
);

// CREATE
router.post(
  "/subtask",
  authorize(["admin", "superAdmin", "team_member"]),
  resolveTeamMember,
  SubtaskController.createSubtask,
);

// UPDATE
router.patch(
  "/subtask/:id",
  authorize(["admin", "superAdmin", "team_member"]),
  resolveTeamMember,
  SubtaskController.updateSubtask,
);

// DELETE
router.delete(
  "/subtask/:id",
  authorize(["admin", "superAdmin", "team_member"]),
  resolveTeamMember,
  SubtaskController.deleteSubtask,
);

export default router;
