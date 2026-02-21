import { Router } from "express";
import { NoteController } from "../controllers/note.controller";
import { authorize } from "../middleware/authorize";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();
router.use(verifyFirebaseToken);
router.use(profileSync);
router.use(requireAppUser);

// READ (company scoped, private/public logic handled in service)
router.get(
  "/notes",
  authorize(["admin", "superAdmin", "team_member"]),
  NoteController.getMyNotes,
);

// CREATE (any authenticated user)
router.post(
  "/notes",
  authorize(["admin", "superAdmin", "team_member"]),
  NoteController.createNote,
);

// UPDATE (author only)
router.patch(
  "/notes/:id",
  authorize(["admin", "superAdmin", "team_member"]),
  NoteController.updateNote,
);

// DELETE (author only)
router.delete(
  "/notes/:id",
  authorize(["admin", "superAdmin", "team_member"]),
  NoteController.deleteNote,
);

export default router;
