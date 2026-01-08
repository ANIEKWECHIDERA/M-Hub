import { Router } from "express";
import { NoteController } from "../controllers/note.controller";
import authenticate from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

// READ (company scoped, private/public logic handled in service)
router.get(
  "/notes",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  NoteController.getMyNotes
);

// CREATE (any authenticated user)
router.post(
  "/notes",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  NoteController.createNote
);

// UPDATE (author only)
router.patch(
  "/notes/:id",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  NoteController.updateNote
);

// DELETE (author only)
router.delete(
  "/notes/:id",
  authenticate,
  authorize(["admin", "superAdmin", "team_member"]),
  NoteController.deleteNote
);

export default router;
