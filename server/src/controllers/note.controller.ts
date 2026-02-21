import { Response } from "express";
import { NoteService } from "../services/note.service";
import { CreateNoteDTO, UpdateNoteDTO } from "../types/note.types";
import { logger } from "../utils/logger";

export const NoteController = {
  async getMyNotes(req: any, res: Response) {
    const companyId = req.user.company_id;
    const authorId = req.user.user_id;

    try {
      logger.info("getMyNotes: fetching user notes", {
        companyId,
        authorId,
      });

      const notes = await NoteService.findByAuthor(companyId, authorId);

      return res.json(notes || []);
    } catch (error) {
      logger.error("getMyNotes: failed", {
        companyId,
        authorId,
        error,
      });

      return res.status(500).json({ error: "Failed to fetch notes" });
    }
  },

  async createNote(req: any, res: Response) {
    const companyId = req.user.company_id;
    const authorId = req.user.user_id;

    const payload: CreateNoteDTO = {
      ...req.body,
      company_id: companyId,
      author_id: authorId,
    };

    try {
      logger.info("createNote: creating note", {
        companyId,
        authorId,
        projectId: payload.project_id,
      });

      const note = await NoteService.create(payload);

      return res.status(201).json(note);
    } catch (error) {
      logger.error("createNote: failed", {
        companyId,
        payload,
        error,
      });

      return res.status(500).json({ error: "Failed to create note" });
    }
  },

  async updateNote(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;
    const authorId = req.user.user_id;

    const payload: UpdateNoteDTO = req.body;

    try {
      logger.info("updateNote: updating note", {
        id,
        companyId,
        authorId,
      });

      const updatedNote = await NoteService.update(
        id,
        companyId,
        authorId,
        payload,
      );

      if (!updatedNote) {
        return res.status(403).json({
          error: "You can only edit your own notes",
        });
      }

      return res.json(updatedNote);
    } catch (error) {
      logger.error("updateNote: failed", {
        id,
        companyId,
        authorId,
        error,
      });

      return res.status(500).json({ error: "Failed to update note" });
    }
  },

  async deleteNote(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;
    const authorId = req.user.user_id;

    try {
      logger.info("deleteNote: deleting note", {
        id,
        companyId,
        authorId,
      });

      await NoteService.deleteById(id, companyId, authorId);

      return res.json({ success: true });
    } catch (error) {
      logger.error("deleteNote: failed", {
        id,
        companyId,
        authorId,
        error,
      });

      return res.status(500).json({ error: "Failed to delete note" });
    }
  },
};
