import { Response } from "express";
import { NoteTagService } from "../services/noteTag.service";
import { logger } from "../utils/logger";

export const NoteTagController = {
  async getNoteTags(req: any, res: Response) {
    const { noteId } = req.params;
    const companyId = req.user.company_id;
    const userId = req.user.user_id;

    try {
      logger.info("getNoteTags: fetching tags", {
        noteId,
        companyId,
        userId,
      });

      const tags = await NoteTagService.getTagsForNote(
        noteId,
        companyId,
        userId
      );

      return res.json(tags);
    } catch (error) {
      logger.error("getNoteTags: failed", {
        noteId,
        companyId,
        error,
      });

      return res.status(500).json({ error: "Failed to fetch tags" });
    }
  },

  async upsertNoteTags(req: any, res: Response) {
    const { noteId } = req.params;
    const { tags } = req.body;
    const companyId = req.user.company_id;
    const userId = req.user.user_id;

    try {
      logger.info("upsertNoteTags: updating tags", {
        noteId,
        companyId,
        userId,
        tags,
      });

      const updatedTags = await NoteTagService.replaceTagsForNote(
        noteId,
        companyId,
        userId,
        tags
      );

      return res.json(updatedTags);
    } catch (error: any) {
      logger.error("upsertNoteTags: failed", {
        noteId,
        companyId,
        userId,
        error,
      });

      if (error.message === "Unauthorized") {
        return res.status(403).json({
          error: "You can only manage tags for your own notes",
        });
      }

      return res.status(500).json({ error: "Failed to update tags" });
    }
  },
};
