import { Router } from "express";
import { CommentController } from "../controllers/comment.controller";
import { authorize } from "../middleware/authorize";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();
router.use(verifyFirebaseToken);
router.use(profileSync);
router.use(requireAppUser);
// READ – everyone
router.get(
  "/project/:projectId/comments",
  authorize(["admin", "superAdmin", "team_member"]),
  CommentController.getCommentsByProject,
);

// CREATE – everyone
router.post(
  "/comments",
  authorize(["admin", "superAdmin", "team_member"]),
  CommentController.createComment,
);

// UPDATE – author only
router.patch(
  "/comments/:id",
  authorize(["admin", "superAdmin", "team_member"]),
  CommentController.updateComment,
);

// DELETE – admins only
router.delete(
  "/comments/:id",
  authorize(["admin", "superAdmin"]),
  CommentController.deleteComment,
);

export default router;
