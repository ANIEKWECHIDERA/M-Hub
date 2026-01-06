import { Router } from "express";
import authenticate from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { ProjectTeamMemberController } from "../controllers/projectTeamMember.controller";

const router = Router();

router.get(
  "/project-team-members",
  authenticate,
  authorize(["admin", "superAdmin"]),
  ProjectTeamMemberController.getAll
);

router.get(
  "/project-team-members/:id",
  authenticate,
  authorize(["admin", "superAdmin"]),
  ProjectTeamMemberController.getById
);

router.post(
  "/project-team-members",
  authenticate,
  authorize(["admin", "superAdmin"]),
  ProjectTeamMemberController.create
);

router.patch(
  "/project-team-members/:id",
  authenticate,
  authorize(["admin", "superAdmin"]),
  ProjectTeamMemberController.update
);

router.delete(
  "/project-team-members/:id",
  authenticate,
  authorize(["admin", "superAdmin"]),
  ProjectTeamMemberController.delete
);

router.post(
  "/project-team-members/bulk",
  authenticate,
  authorize(["admin", "superAdmin"]),
  ProjectTeamMemberController.bulkAssign
);

export default router;
