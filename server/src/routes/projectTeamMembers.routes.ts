import { Router } from "express";
import { authorize } from "../middleware/authorize";
import { ProjectTeamMemberController } from "../controllers/projectTeamMember.controller";

import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();
router.use(verifyFirebaseToken);
router.use(profileSync);
router.use(requireAppUser);

router.get(
  "/project-team-members",
  authorize(["team_member", "admin", "superAdmin"]),
  ProjectTeamMemberController.getAll,
);

router.get(
  "/project-team-members/:id",
  authorize(["team_member", "admin", "superAdmin"]),
  ProjectTeamMemberController.getById,
);

router.post(
  "/project-team-members",
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
  authorize(["admin", "superAdmin"]),
  ProjectTeamMemberController.delete,
);

router.post(
  "/project-team-members/bulk",
  authorize(["admin", "superAdmin"]),
  ProjectTeamMemberController.bulkAssign,
);

export default router;
