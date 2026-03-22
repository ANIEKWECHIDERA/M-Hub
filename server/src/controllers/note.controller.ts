import { Response } from "express";
import { ZodError } from "zod";
import {
  createNoteSchema,
  noteListQuerySchema,
  pinNoteSchema,
  updateNoteSchema,
} from "../dtos/note.dto";
import { NoteService } from "../services/note.service";

const getScopedUser = (req: any) => ({
  companyId: req.user.company_id as string,
  authorId: (req.user.id ?? req.user.user_id) as string,
});

const handleNoteError = (res: Response, error: unknown, fallback: string) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: "Invalid note payload",
      details: error.issues,
    });
  }

  return res.status(500).json({ error: fallback });
};

export const NoteController = {
  async listNotes(req: any, res: Response) {
    const { companyId, authorId } = getScopedUser(req);

    try {
      const query = noteListQuerySchema.parse(req.query);
      const notes = await NoteService.listForAuthor(companyId, authorId, query);
      return res.json({ notes });
    } catch (error) {
      req.log?.error("NoteController.listNotes: failed", {
        companyId,
        authorId,
        error,
      });
      return handleNoteError(res, error, "Failed to fetch notes");
    }
  },

  async getNote(req: any, res: Response) {
    const { companyId, authorId } = getScopedUser(req);
    const { id } = req.params;

    try {
      const note = await NoteService.getById(id, companyId, authorId);

      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }

      return res.json({ note });
    } catch (error) {
      req.log?.error("NoteController.getNote: failed", {
        id,
        companyId,
        authorId,
        error,
      });
      return handleNoteError(res, error, "Failed to fetch note");
    }
  },

  async createNote(req: any, res: Response) {
    const { companyId, authorId } = getScopedUser(req);

    try {
      const body = createNoteSchema.parse(req.body);
      const note = await NoteService.create({
        ...body,
        company_id: companyId,
        author_id: authorId,
      });

      return res.status(201).json({ note });
    } catch (error) {
      req.log?.error("NoteController.createNote: failed", {
        companyId,
        authorId,
        error,
      });
      return handleNoteError(res, error, "Failed to create note");
    }
  },

  async updateNote(req: any, res: Response) {
    const { companyId, authorId } = getScopedUser(req);
    const { id } = req.params;

    try {
      const body = updateNoteSchema.parse(req.body);
      const note = await NoteService.update(id, companyId, authorId, body);

      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }

      return res.json({ note });
    } catch (error) {
      req.log?.error("NoteController.updateNote: failed", {
        id,
        companyId,
        authorId,
        error,
      });
      return handleNoteError(res, error, "Failed to update note");
    }
  },

  async archiveNote(req: any, res: Response) {
    const { companyId, authorId } = getScopedUser(req);
    const { id } = req.params;

    try {
      const archived = await NoteService.archive(id, companyId, authorId);

      if (!archived) {
        return res.status(404).json({ error: "Note not found" });
      }

      return res.json({ success: true });
    } catch (error) {
      req.log?.error("NoteController.archiveNote: failed", {
        id,
        companyId,
        authorId,
        error,
      });
      return handleNoteError(res, error, "Failed to archive note");
    }
  },

  async restoreNote(req: any, res: Response) {
    const { companyId, authorId } = getScopedUser(req);
    const { id } = req.params;

    try {
      const note = await NoteService.restore(id, companyId, authorId);

      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }

      return res.json({ note });
    } catch (error) {
      req.log?.error("NoteController.restoreNote: failed", {
        id,
        companyId,
        authorId,
        error,
      });
      return handleNoteError(res, error, "Failed to restore note");
    }
  },

  async deleteNote(req: any, res: Response) {
    const { companyId, authorId } = getScopedUser(req);
    const { id } = req.params;

    try {
      const deleted = await NoteService.destroy(id, companyId, authorId);

      if (!deleted) {
        return res.status(404).json({ error: "Note not found" });
      }

      return res.json({ success: true });
    } catch (error) {
      req.log?.error("NoteController.deleteNote: failed", {
        id,
        companyId,
        authorId,
        error,
      });
      return handleNoteError(res, error, "Failed to delete note");
    }
  },

  async setPinned(req: any, res: Response) {
    const { companyId, authorId } = getScopedUser(req);
    const { id } = req.params;

    try {
      const { pinned } = pinNoteSchema.parse(req.body);
      const note = await NoteService.setPinned(id, companyId, authorId, pinned);

      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }

      return res.json({ note });
    } catch (error) {
      req.log?.error("NoteController.setPinned: failed", {
        id,
        companyId,
        authorId,
        error,
      });
      return handleNoteError(res, error, "Failed to update note pin");
    }
  },
};
