import { Router } from "express";
import { TeamMemberController } from "../controllers/teamMember.controller";
import authenticate from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

router.get(
  "/team-members",
  authenticate,
  authorize(["admin", "superAdmin"]),
  TeamMemberController.getTeamMembers
);

router.get(
  "/team-members/:id",
  authenticate,
  authorize(["admin", "superAdmin"]),
  TeamMemberController.getTeamMember
);

router.post(
  "/team-members",
  authenticate,
  authorize(["admin", "superAdmin"]),
  TeamMemberController.createTeamMember
);

router.patch(
  "/team-members/:id",
  authenticate,
  authorize(["admin", "superAdmin"]),
  TeamMemberController.updateTeamMember
);

router.delete(
  "/team-members/:id",
  authenticate,
  authorize(["admin", "superAdmin"]),
  TeamMemberController.deleteTeamMember
);

export default router;
