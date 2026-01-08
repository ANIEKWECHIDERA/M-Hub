import { Router } from "express";
import { NoteTagController } from "../controllers/noteTag.controller";
import authenticate from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

// READ tags for a note (author only)
router.get(
  "/notes/:noteId/tags",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  NoteTagController.getNoteTags
);

// ADD / UPDATE / REMOVE tags (replace-all strategy)
router.put(
  "/notes/:noteId/tags",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  NoteTagController.upsertNoteTags
);

export default router;
