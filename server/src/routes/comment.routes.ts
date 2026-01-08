import { Router } from "express";
import { CommentController } from "../controllers/comment.controller";
import authenticate from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

// READ – everyone
router.get(
  "/project/:projectId/comments",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  CommentController.getCommentsByProject
);

// CREATE – everyone
router.post(
  "/comments",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  CommentController.createComment
);

// UPDATE – author only
router.patch(
  "/comments/:id",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  CommentController.updateComment
);

// DELETE – admins only
router.delete(
  "/comments/:id",
  authenticate,
  authorize(["admin", "superAdmin"]),
  CommentController.deleteComment
);

export default router;
