import { supabaseAdmin } from "../config/supabaseClient";
import { logger } from "../utils/logger";
import { NoteTagResponseDTO } from "../types/noteTag.types";

function normalizeTags(tags: string): string[] {
  return [
    ...new Set(
      tags
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

export const NoteTagService = {
  async getTagsForNote(
    noteId: string,
    companyId: string,
    authorId: string
  ): Promise<NoteTagResponseDTO[]> {
    logger.info("NoteTagService.getTagsForNote: start", {
      noteId,
      companyId,
      authorId,
    });

    // Ensure user owns the note
    const { data: note, error: noteError } = await supabaseAdmin
      .from("notes")
      .select("id")
      .eq("id", noteId)
      .eq("company_id", companyId)
      .eq("author_id", authorId)
      .maybeSingle();

    if (noteError || !note) {
      logger.warn("NoteTagService.getTagsForNote: unauthorized access", {
        noteId,
        companyId,
        authorId,
      });
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from("note_tags")
      .select("id, note_id, tag")
      .eq("note_id", noteId);

    if (error) {
      logger.error("NoteTagService.getTagsForNote: supabase error", { error });
      throw error;
    }

    return data;
  },

  async replaceTagsForNote(
    noteId: string,
    companyId: string,
    authorId: string,
    tags: string
  ): Promise<NoteTagResponseDTO[]> {
    logger.info("NoteTagService.replaceTagsForNote: start", {
      noteId,
      companyId,
      authorId,
    });

    const parsedTags = normalizeTags(tags);

    // Validate note ownership
    const { data: note, error: noteError } = await supabaseAdmin
      .from("notes")
      .select("id")
      .eq("id", noteId)
      .eq("company_id", companyId)
      .eq("author_id", authorId)
      .maybeSingle();

    if (noteError || !note) {
      throw new Error("Unauthorized");
    }

    // Delete existing tags
    const { error: deleteError } = await supabaseAdmin
      .from("note_tags")
      .delete()
      .eq("note_id", noteId);

    if (deleteError) {
      logger.error("NoteTagService.replaceTagsForNote: delete failed", {
        deleteError,
      });
      throw deleteError;
    }

    // Insert new tags
    if (!parsedTags.length) return [];

    const inserts = parsedTags.map((tag) => ({
      note_id: noteId,
      company_id: companyId,
      tag,
    }));

    const { data, error } = await supabaseAdmin
      .from("note_tags")
      .insert(inserts)
      .select("id, note_id, tag");

    if (error) {
      logger.error("NoteTagService.replaceTagsForNote: insert failed", {
        error,
      });
      throw error;
    }

    return data;
  },
};
