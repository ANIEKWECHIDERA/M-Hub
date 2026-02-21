import { Router } from "express";
import { TeamMemberController } from "../controllers/teamMember.controller";
import authenticate from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();
router.use(verifyFirebaseToken);
router.use(profileSync);
router.use(requireAppUser);

router.get(
  "/team-members",
  authorize(["admin", "superAdmin"]),
  TeamMemberController.getTeamMembers,
);

router.get(
  "/team-members/:id",
  authorize(["admin", "superAdmin"]),
  TeamMemberController.getTeamMember,
);

router.post(
  "/team-members",
  authorize(["admin", "superAdmin"]),
  TeamMemberController.createTeamMember,
);

router.patch(
  "/team-members/:id",
  authorize(["superAdmin"]),
  TeamMemberController.updateTeamMember,
);

router.delete(
  "/team-members/:id",
  authorize(["superAdmin"]),
  TeamMemberController.deleteTeamMember,
);

export default router;
