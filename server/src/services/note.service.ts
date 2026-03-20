import { supabaseAdmin } from "../config/supabaseClient";
import {
  CreateNoteDTO,
  NoteListQuery,
  NoteResponseDTO,
  NoteSummaryDTO,
  UpdateNoteDTO,
} from "../types/note.types";
import { logger } from "../utils/logger";
import {
  extractNotePlainTextPreview,
  normalizeNoteTags,
  normalizeNoteTitle,
  sanitizeNoteHtml,
} from "../lib/noteSanitizer";
import { NoteTagService } from "./noteTag.service";

type NoteRow = {
  id: string;
  company_id: string;
  project_id: string | null;
  author_id: string;
  title: string;
  content: string;
  plain_text_preview: string;
  pinned: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  last_edited_at: string;
  note_tags?: Array<{ tag: string }> | null;
};

const NOTE_BASE_SELECT = `
  id,
  company_id,
  project_id,
  author_id,
  title,
  content,
  plain_text_preview,
  pinned,
  archived_at,
  created_at,
  updated_at,
  last_edited_at,
  note_tags(tag)
`;

function mapTags(row: NoteRow): string[] {
  return row.note_tags?.map((tagRow) => tagRow.tag) ?? [];
}

function toNoteSummaryDTO(row: NoteRow): NoteSummaryDTO {
  return {
    id: row.id,
    company_id: row.company_id,
    project_id: row.project_id,
    author_id: row.author_id,
    title: row.title,
    plain_text_preview: row.plain_text_preview,
    pinned: row.pinned,
    archived_at: row.archived_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_edited_at: row.last_edited_at,
    tags: mapTags(row),
  };
}

function toNoteResponseDTO(row: NoteRow): NoteResponseDTO {
  return {
    ...toNoteSummaryDTO(row),
    content_html: row.content,
  };
}

function buildPersistedNote(payload: {
  title?: string;
  content_html?: string;
  project_id?: string | null;
  pinned?: boolean;
}) {
  const contentHtml = sanitizeNoteHtml(payload.content_html);

  return {
    title: normalizeNoteTitle(payload.title),
    content: contentHtml,
    plain_text_preview: extractNotePlainTextPreview(contentHtml),
    project_id: payload.project_id ?? null,
    pinned: payload.pinned ?? false,
    last_edited_at: new Date().toISOString(),
  };
}

export const NoteService = {
  async listForAuthor(
    companyId: string,
    authorId: string,
    query: NoteListQuery,
  ): Promise<NoteSummaryDTO[]> {
    logger.info("NoteService.listForAuthor: start", {
      companyId,
      authorId,
      archived: query.archived ?? false,
      q: query.q ?? null,
    });

    let request = supabaseAdmin
      .from("notes")
      .select(NOTE_BASE_SELECT)
      .eq("company_id", companyId)
      .eq("author_id", authorId);

    if (query.archived) {
      request = request.not("archived_at", "is", null);
    } else {
      request = request.is("archived_at", null);
    }

    if (query.q) {
      const searchTerm = query.q.replace(/[%_]/g, "").trim();
      request = request.or(
        `title.ilike.%${searchTerm}%,plain_text_preview.ilike.%${searchTerm}%`,
      );
    }

    const { data, error } = await request
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) {
      logger.error("NoteService.listForAuthor: supabase error", { error });
      throw error;
    }

    return (data as NoteRow[]).map(toNoteSummaryDTO);
  },

  async getById(
    id: string,
    companyId: string,
    authorId: string,
  ): Promise<NoteResponseDTO | null> {
    logger.info("NoteService.getById: start", { id, companyId, authorId });

    const { data, error } = await supabaseAdmin
      .from("notes")
      .select(NOTE_BASE_SELECT)
      .eq("id", id)
      .eq("company_id", companyId)
      .eq("author_id", authorId)
      .maybeSingle();

    if (error) {
      logger.error("NoteService.getById: supabase error", { error });
      throw error;
    }

    return data ? toNoteResponseDTO(data as NoteRow) : null;
  },

  async create(payload: CreateNoteDTO): Promise<NoteResponseDTO> {
    logger.info("NoteService.create: start", {
      companyId: payload.company_id,
      authorId: payload.author_id,
      projectId: payload.project_id ?? null,
      pinned: payload.pinned ?? false,
    });

    const persisted = buildPersistedNote(payload);
    const tags = normalizeNoteTags(payload.tags);

    const { data, error } = await supabaseAdmin
      .from("notes")
      .insert({
        company_id: payload.company_id,
        author_id: payload.author_id,
        visibility: "private",
        ...persisted,
      })
      .select(NOTE_BASE_SELECT)
      .single();

    if (error) {
      logger.error("NoteService.create: supabase error", { error });
      throw error;
    }

    if (tags.length) {
      await NoteTagService.replaceTagsForNote(
        data.id,
        payload.company_id,
        payload.author_id,
        tags.join(","),
      );
    }

    const refreshed = await this.getById(data.id, payload.company_id, payload.author_id);

    if (!refreshed) {
      throw new Error("Failed to load created note");
    }

    return refreshed;
  },

  async update(
    id: string,
    companyId: string,
    authorId: string,
    payload: UpdateNoteDTO,
  ): Promise<NoteResponseDTO | null> {
    logger.info("NoteService.update: start", {
      id,
      companyId,
      authorId,
      hasTags: Array.isArray(payload.tags),
    });

    const updates: Record<string, unknown> = {};

    if (payload.title !== undefined) {
      updates.title = normalizeNoteTitle(payload.title);
    }

    if (payload.content_html !== undefined) {
      const contentHtml = sanitizeNoteHtml(payload.content_html);
      updates.content = contentHtml;
      updates.plain_text_preview = extractNotePlainTextPreview(contentHtml);
      updates.last_edited_at = new Date().toISOString();
    }

    if (payload.project_id !== undefined) {
      updates.project_id = payload.project_id ?? null;
    }

    if (payload.pinned !== undefined) {
      updates.pinned = payload.pinned;
    }

    const hasRowUpdate = Object.keys(updates).length > 0;

    if (hasRowUpdate) {
      const { error } = await supabaseAdmin
        .from("notes")
        .update(updates)
        .eq("id", id)
        .eq("company_id", companyId)
        .eq("author_id", authorId);

      if (error) {
        logger.error("NoteService.update: supabase error", { error });
        throw error;
      }
    } else {
      const note = await this.getById(id, companyId, authorId);
      if (!note) {
        return null;
      }
    }

    if (payload.tags !== undefined) {
      await NoteTagService.replaceTagsForNote(
        id,
        companyId,
        authorId,
        normalizeNoteTags(payload.tags).join(","),
      );
    }

    return this.getById(id, companyId, authorId);
  },

  async archive(
    id: string,
    companyId: string,
    authorId: string,
  ): Promise<boolean> {
    logger.info("NoteService.archive: start", { id, companyId, authorId });

    const { data, error } = await supabaseAdmin
      .from("notes")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId)
      .eq("author_id", authorId)
      .is("archived_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      logger.error("NoteService.archive: supabase error", { error });
      throw error;
    }

    return Boolean(data);
  },

  async restore(
    id: string,
    companyId: string,
    authorId: string,
  ): Promise<NoteResponseDTO | null> {
    logger.info("NoteService.restore: start", { id, companyId, authorId });

    const { error } = await supabaseAdmin
      .from("notes")
      .update({ archived_at: null })
      .eq("id", id)
      .eq("company_id", companyId)
      .eq("author_id", authorId)
      .not("archived_at", "is", null);

    if (error) {
      logger.error("NoteService.restore: supabase error", { error });
      throw error;
    }

    return this.getById(id, companyId, authorId);
  },

  async setPinned(
    id: string,
    companyId: string,
    authorId: string,
    pinned: boolean,
  ): Promise<NoteResponseDTO | null> {
    logger.info("NoteService.setPinned: start", {
      id,
      companyId,
      authorId,
      pinned,
    });

    const { error } = await supabaseAdmin
      .from("notes")
      .update({ pinned })
      .eq("id", id)
      .eq("company_id", companyId)
      .eq("author_id", authorId);

    if (error) {
      logger.error("NoteService.setPinned: supabase error", { error });
      throw error;
    }

    return this.getById(id, companyId, authorId);
  },
};
