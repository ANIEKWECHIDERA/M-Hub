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
};

type LegacyNoteRow = {
  id: string;
  company_id: string;
  project_id: string | null;
  author_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
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
  last_edited_at
`;

const LEGACY_NOTE_SELECT = `
  id,
  company_id,
  project_id,
  author_id,
  title,
  content,
  created_at,
  updated_at
`;

let noteSchemaMode: "modern" | "legacy" | null = null;

function isLegacyCompatibilityError(error: any) {
  const message = String(error?.message ?? "");

  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    message.includes("plain_text_preview") ||
    message.includes("last_edited_at") ||
    message.includes("archived_at") ||
    message.includes("pinned")
  );
}

async function getNoteTagsMap(noteIds: string[], companyId: string) {
  if (!noteIds.length) {
    return new Map<string, string[]>();
  }

  const map = new Map<string, string[]>();

  let request = supabaseAdmin
    .from("note_tags")
    .select("note_id, tag")
    .in("note_id", noteIds);

  let { data, error } = await request.eq("company_id", companyId);

  if (error && isLegacyCompatibilityError(error)) {
    ({ data, error } = await request);
  }

  if (error) {
    logger.error("NoteService.getNoteTagsMap: supabase error", { error });
    throw error;
  }

  for (const row of data ?? []) {
    const current = map.get(row.note_id) ?? [];
    current.push(row.tag);
    map.set(row.note_id, current);
  }

  return map;
}

function toLegacySummaryDTO(
  row: LegacyNoteRow,
  tagsMap: Map<string, string[]>,
): NoteSummaryDTO {
  return {
    id: row.id,
    company_id: row.company_id,
    project_id: row.project_id,
    author_id: row.author_id,
    title: row.title,
    plain_text_preview: extractNotePlainTextPreview(row.content ?? ""),
    pinned: false,
    archived_at: null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_edited_at: row.updated_at,
    tags: tagsMap.get(row.id) ?? [],
  };
}

function toLegacyResponseDTO(
  row: LegacyNoteRow,
  tagsMap: Map<string, string[]>,
): NoteResponseDTO {
  return {
    ...toLegacySummaryDTO(row, tagsMap),
    content_html: row.content,
  };
}

function toNoteSummaryDTO(row: NoteRow, tags: string[] = []): NoteSummaryDTO {
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
    tags,
  };
}

function toNoteResponseDTO(row: NoteRow, tags: string[] = []): NoteResponseDTO {
  return {
    ...toNoteSummaryDTO(row, tags),
    content_html: row.content,
  };
}

async function deleteNoteTagsForNote(noteId: string, companyId: string) {
  let request = supabaseAdmin
    .from("note_tags")
    .delete()
    .eq("note_id", noteId);

  let { error } = await request.eq("company_id", companyId);

  if (error && isLegacyCompatibilityError(error)) {
    ({ error } = await request);
  }

  if (error) {
    logger.error("NoteService.deleteNoteTagsForNote: supabase error", { error });
    throw error;
  }
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

    if (noteSchemaMode !== "legacy") {
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

      if (!error) {
        noteSchemaMode = "modern";
        const rows = (data ?? []) as NoteRow[];
        const tagsMap = await getNoteTagsMap(
          rows.map((row) => row.id),
          companyId,
        );
        return rows.map((row) => toNoteSummaryDTO(row, tagsMap.get(row.id) ?? []));
      }

      if (!isLegacyCompatibilityError(error)) {
        logger.error("NoteService.listForAuthor: supabase error", { error });
        throw error;
      }

      noteSchemaMode = "legacy";
      logger.warn("NoteService.listForAuthor: using legacy note schema compatibility mode", {
        companyId,
        authorId,
      });
    }

    if (query.archived) {
      return [];
    }

    let legacyRequest = supabaseAdmin
      .from("notes")
      .select(LEGACY_NOTE_SELECT)
      .eq("company_id", companyId)
      .eq("author_id", authorId);

    if (query.q) {
      const searchTerm = query.q.replace(/[%_]/g, "").trim();
      legacyRequest = legacyRequest.or(
        `title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`,
      );
    }

    const { data, error } = await legacyRequest.order("updated_at", {
      ascending: false,
    });

    if (error) {
      logger.error("NoteService.listForAuthor: legacy supabase error", { error });
      throw error;
    }

    const rows = (data ?? []) as LegacyNoteRow[];
    const tagsMap = await getNoteTagsMap(
      rows.map((row) => row.id),
      companyId,
    );

    return rows.map((row) => toLegacySummaryDTO(row, tagsMap));
  },

  async getById(
    id: string,
    companyId: string,
    authorId: string,
  ): Promise<NoteResponseDTO | null> {
    logger.info("NoteService.getById: start", { id, companyId, authorId });

    if (noteSchemaMode !== "legacy") {
      const { data, error } = await supabaseAdmin
        .from("notes")
        .select(NOTE_BASE_SELECT)
        .eq("id", id)
        .eq("company_id", companyId)
        .eq("author_id", authorId)
        .maybeSingle();

      if (!error) {
        noteSchemaMode = "modern";
        if (!data) {
          return null;
        }

        const tagsMap = await getNoteTagsMap([id], companyId);
        return toNoteResponseDTO(data as NoteRow, tagsMap.get(id) ?? []);
      }

      if (!isLegacyCompatibilityError(error)) {
        logger.error("NoteService.getById: supabase error", { error });
        throw error;
      }

      noteSchemaMode = "legacy";
    }

    const { data, error } = await supabaseAdmin
      .from("notes")
      .select(LEGACY_NOTE_SELECT)
      .eq("id", id)
      .eq("company_id", companyId)
      .eq("author_id", authorId)
      .maybeSingle();

    if (error) {
      logger.error("NoteService.getById: legacy supabase error", { error });
      throw error;
    }

    if (!data) {
      return null;
    }

    const tagsMap = await getNoteTagsMap([data.id], companyId);
    return toLegacyResponseDTO(data as LegacyNoteRow, tagsMap);
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

    let data: any;

    if (noteSchemaMode !== "legacy") {
      const modernResult = await supabaseAdmin
        .from("notes")
        .insert({
          company_id: payload.company_id,
          author_id: payload.author_id,
          visibility: "private",
          ...persisted,
        })
        .select(NOTE_BASE_SELECT)
        .single();

      if (!modernResult.error) {
        noteSchemaMode = "modern";
        data = modernResult.data;
      } else if (isLegacyCompatibilityError(modernResult.error)) {
        noteSchemaMode = "legacy";
      } else {
        logger.error("NoteService.create: supabase error", {
          error: modernResult.error,
        });
        throw modernResult.error;
      }
    }

    if (noteSchemaMode === "legacy") {
      const legacyResult = await supabaseAdmin
        .from("notes")
        .insert({
          company_id: payload.company_id,
          author_id: payload.author_id,
          visibility: "private",
          title: persisted.title,
          content: persisted.content,
          project_id: persisted.project_id,
        })
        .select(LEGACY_NOTE_SELECT)
        .single();

      if (legacyResult.error) {
        logger.error("NoteService.create: legacy supabase error", {
          error: legacyResult.error,
        });
        throw legacyResult.error;
      }

      data = legacyResult.data;
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
      if (noteSchemaMode !== "legacy") {
        updates.plain_text_preview = extractNotePlainTextPreview(contentHtml);
        updates.last_edited_at = new Date().toISOString();
      }
    }

    if (payload.project_id !== undefined) {
      updates.project_id = payload.project_id ?? null;
    }

    if (payload.pinned !== undefined && noteSchemaMode !== "legacy") {
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
        if (isLegacyCompatibilityError(error)) {
          noteSchemaMode = "legacy";

          const legacyUpdates: Record<string, unknown> = {};

          if (payload.title !== undefined) {
            legacyUpdates.title = normalizeNoteTitle(payload.title);
          }

          if (payload.content_html !== undefined) {
            legacyUpdates.content = sanitizeNoteHtml(payload.content_html);
          }

          if (payload.project_id !== undefined) {
            legacyUpdates.project_id = payload.project_id ?? null;
          }

          if (Object.keys(legacyUpdates).length > 0) {
            const legacyResult = await supabaseAdmin
              .from("notes")
              .update(legacyUpdates)
              .eq("id", id)
              .eq("company_id", companyId)
              .eq("author_id", authorId);

            if (legacyResult.error) {
              logger.error("NoteService.update: legacy supabase error", {
                error: legacyResult.error,
              });
              throw legacyResult.error;
            }
          }
        } else {
          logger.error("NoteService.update: supabase error", { error });
          throw error;
        }
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

    if (!error) {
      noteSchemaMode = "modern";
      return Boolean(data);
    }

    if (!isLegacyCompatibilityError(error)) {
      logger.error("NoteService.archive: supabase error", { error });
      throw error;
    }

    noteSchemaMode = "legacy";
    const legacyResult = await supabaseAdmin
      .from("notes")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId)
      .eq("author_id", authorId)
      .select("id")
      .maybeSingle();

    if (legacyResult.error) {
      logger.error("NoteService.archive: legacy delete fallback error", {
        error: legacyResult.error,
      });
      throw legacyResult.error;
    }

    return Boolean(legacyResult.data);
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
      if (isLegacyCompatibilityError(error)) {
        noteSchemaMode = "legacy";
        return null;
      }

      logger.error("NoteService.restore: supabase error", { error });
      throw error;
    }

    return this.getById(id, companyId, authorId);
  },

  async destroy(
    id: string,
    companyId: string,
    authorId: string,
  ): Promise<boolean> {
    logger.info("NoteService.destroy: start", { id, companyId, authorId });

    await deleteNoteTagsForNote(id, companyId);

    const { data, error } = await supabaseAdmin
      .from("notes")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId)
      .eq("author_id", authorId)
      .select("id")
      .maybeSingle();

    if (error) {
      logger.error("NoteService.destroy: supabase error", { error });
      throw error;
    }

    return Boolean(data);
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
      if (isLegacyCompatibilityError(error)) {
        noteSchemaMode = "legacy";
        return this.getById(id, companyId, authorId);
      }

      logger.error("NoteService.setPinned: supabase error", { error });
      throw error;
    }

    return this.getById(id, companyId, authorId);
  },
};
