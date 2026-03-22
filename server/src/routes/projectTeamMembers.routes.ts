import { Router } from "express";
import { authorize } from "../middleware/authorize";
import { ProjectTeamMemberController } from "../controllers/projectTeamMember.controller";

import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();
const protectedRoute = [verifyFirebaseToken, profileSync, requireAppUser];

router.get(
  "/project-team-members",
  ...protectedRoute,
  authorize(["team_member", "admin", "superAdmin"]),
  ProjectTeamMemberController.getAll,
);

router.get(
  "/project-team-members/:id",
  ...protectedRoute,
  authorize(["team_member", "admin", "superAdmin"]),
  ProjectTeamMemberController.getById,
);

router.post(
  "/project-team-members",
  ...protectedRoute,
  authorize(["admin", "superAdmin"]),
  ProjectTeamMemberController.create,
);

// router.patch(
//   "/project-team-members/:id",
//
//   authorize(["admin", "superAdmin"]),
//   ProjectTeamMemberController.update
// );

router.delete(
  "/project-team-members/:id",
  ...protectedRoute,
  authorize(["admin", "superAdmin"]),
  ProjectTeamMemberController.delete,
);

router.post(
  "/project-team-members/bulk",
  ...protectedRoute,
  authorize(["admin", "superAdmin"]),
  ProjectTeamMemberController.bulkAssign,
);

export default router;
