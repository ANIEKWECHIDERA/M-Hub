import { Router } from "express";
import { NoteController } from "../controllers/note.controller";
import { authorize } from "../middleware/authorize";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";

const router = Router();
const protectedRoute = [verifyFirebaseToken, profileSync, requireAppUser];
const noteRoles = ["admin", "superAdmin", "team_member", "member"] as const;

router.get(
  "/notes",
  ...protectedRoute,
  authorize([...noteRoles]),
  NoteController.listNotes,
);

router.get(
  "/notes/:id",
  ...protectedRoute,
  authorize([...noteRoles]),
  NoteController.getNote,
);

router.post(
  "/notes",
  ...protectedRoute,
  authorize([...noteRoles]),
  NoteController.createNote,
);

router.patch(
  "/notes/:id",
  ...protectedRoute,
  authorize([...noteRoles]),
  NoteController.updateNote,
);

router.patch(
  "/notes/:id/pin",
  ...protectedRoute,
  authorize([...noteRoles]),
  NoteController.setPinned,
);

router.post(
  "/notes/:id/restore",
  ...protectedRoute,
  authorize([...noteRoles]),
  NoteController.restoreNote,
);

router.delete(
  "/notes/:id/permanent",
  ...protectedRoute,
  authorize([...noteRoles]),
  NoteController.deleteNote,
);

router.delete(
  "/notes/:id",
  ...protectedRoute,
  authorize([...noteRoles]),
  NoteController.archiveNote,
);

export default router;
