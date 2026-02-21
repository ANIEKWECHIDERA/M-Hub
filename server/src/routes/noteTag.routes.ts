import { Router } from "express";
import { NoteTagController } from "../controllers/noteTag.controller";
import { authorize } from "../middleware/authorize";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();
router.use(verifyFirebaseToken);
router.use(profileSync);
router.use(requireAppUser);

// READ tags for a note (author only)
router.get(
  "/notes/:noteId/tags",
  authorize(["admin", "superAdmin", "team_member"]),
  NoteTagController.getNoteTags,
);

// ADD / UPDATE / REMOVE tags (replace-all strategy)
router.put(
  "/notes/:noteId/tags",
  authorize(["admin", "superAdmin", "team_member"]),
  NoteTagController.upsertNoteTags,
);

export default router;
