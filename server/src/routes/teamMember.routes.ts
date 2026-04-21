import { Router } from "express";
import { TeamMemberController } from "../controllers/teamMember.controller";
import { authorize } from "../middleware/authorize";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();
const protectedRoute = [verifyFirebaseToken, profileSync, requireAppUser];

router.get(
  "/team-members",
  ...protectedRoute,
  authorize(["team_member", "admin", "superAdmin"]),
  TeamMemberController.getTeamMembers,
);

router.get(
  "/team-members/:id",
  ...protectedRoute,
  authorize(["admin", "superAdmin"]),
  TeamMemberController.getTeamMember,
);

router.post(
  "/team-members",
  ...protectedRoute,
  authorize(["admin", "superAdmin"]),
  TeamMemberController.createTeamMember,
);

router.patch(
  "/team-members/:id",
  ...protectedRoute,
  authorize(["admin", "superAdmin"]),
  TeamMemberController.updateTeamMember,
);

router.delete(
  "/team-members/:id",
  ...protectedRoute,
  authorize(["admin", "superAdmin"]),
  TeamMemberController.deleteTeamMember,
);

export default router;
