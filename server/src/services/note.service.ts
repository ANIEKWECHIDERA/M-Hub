import { supabaseAdmin } from "../config/supabaseClient";
import {
  CreateNoteDTO,
  UpdateNoteDTO,
  NoteResponseDTO,
} from "../types/note.types";
import { logger } from "../utils/logger";

function toNoteResponseDTO(row: any): NoteResponseDTO {
  return {
    id: row.id,
    company_id: row.company_id,
    project_id: row.project_id,
    author_id: row.author_id,
    title: row.title,
    content: row.content,
    visibility: row.visibility,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const NoteService = {
  async findByAuthor(
    companyId: string,
    authorId: string
  ): Promise<NoteResponseDTO[]> {
    logger.info("NoteService.findByAuthor: start", {
      companyId,
      authorId,
    });

    const { data, error } = await supabaseAdmin
      .from("notes")
      .select(
        "id, company_id, project_id, author_id, title, content, visibility, created_at, updated_at"
      )
      .eq("company_id", companyId)
      .eq("author_id", authorId)
      .order("updated_at", { ascending: false });

    if (error) {
      logger.error("NoteService.findByAuthor: supabase error", { error });
      throw error;
    }

    return data.map(toNoteResponseDTO);
  },

  async create(payload: CreateNoteDTO): Promise<NoteResponseDTO> {
    logger.info("NoteService.create: start", {
      companyId: payload.company_id,
      projectId: payload.project_id,
      authorId: payload.author_id,
    });

    const { data, error } = await supabaseAdmin
      .from("notes")
      .insert({
        ...payload,
        visibility: payload.visibility ?? "private",
      })
      .select(
        "id, company_id, project_id, author_id, title, content, visibility, created_at, updated_at"
      )
      .single();

    if (error) {
      logger.error("NoteService.create: supabase error", { error });
      throw error;
    }

    return toNoteResponseDTO(data);
  },

  async update(
    id: string,
    companyId: string,
    authorId: string,
    payload: UpdateNoteDTO
  ): Promise<NoteResponseDTO | null> {
    logger.info("NoteService.update: start", {
      id,
      companyId,
      authorId,
    });

    const { data, error } = await supabaseAdmin
      .from("notes")
      .update(payload)
      .eq("id", id)
      .eq("company_id", companyId)
      .eq("author_id", authorId)
      .select(
        "id, company_id, project_id, author_id, title, content, visibility, created_at, updated_at"
      )
      .maybeSingle();

    if (error) {
      logger.error("NoteService.update: supabase error", { error });
      throw error;
    }

    return data ? toNoteResponseDTO(data) : null;
  },

  async deleteById(
    id: string,
    companyId: string,
    authorId: string
  ): Promise<void> {
    logger.info("NoteService.deleteById: start", {
      id,
      companyId,
      authorId,
    });

    const { error } = await supabaseAdmin
      .from("notes")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId)
      .eq("author_id", authorId);

    if (error) {
      logger.error("NoteService.deleteById: supabase error", { error });
      throw error;
    }
  },
};
