import { supabaseAdmin } from "../config/supabaseClient";
import {
  CreateCommentDTO,
  UpdateCommentDTO,
  CommentResponseDTO,
} from "../types/comment.types";
import { commentRealtimeService } from "./commentRealtime.service";
import { logger } from "../utils/logger";

function buildAuthorName(user: any) {
  const fullName = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || user?.display_name || user?.email || "Unknown user";
}

async function loadAuthors(authorIds: string[]) {
  if (authorIds.length === 0) {
    return new Map<string, any>();
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, email, display_name, first_name, last_name, photo_url")
    .in("id", authorIds);

  if (error) {
    logger.error("CommentService.loadAuthors: supabase error", { error });
    throw error;
  }

  return new Map((data ?? []).map((user: any) => [user.id, user]));
}

function toCommentResponseDTO(row: any, author?: any): CommentResponseDTO {
  return {
    id: row.id,
    company_id: row.company_id,
    project_id: row.project_id,
    task_id: row.task_id,
    author_id: row.author_id,
    content: row.content,
    timestamp: row.timestamp,
    updated_at: row.updated_at,
    author: {
      id: author?.id ?? row.author_id,
      name: buildAuthorName(author),
      avatar: author?.photo_url ?? null,
    },
  };
}

export const CommentService = {
  async findByProject(
    projectId: string,
    companyId: string
  ): Promise<CommentResponseDTO[]> {
    logger.info("CommentService.findByProject: start", {
      projectId,
      companyId,
    });

    const { data, error } = await supabaseAdmin
      .from("comments")
      .select(
        "id, company_id, project_id, task_id, author_id, content, timestamp, updated_at"
      )
      .eq("project_id", projectId)
      .eq("company_id", companyId)
      .order("timestamp", { ascending: true });

    if (error) {
      logger.error("CommentService.findByProject: supabase error", { error });
      throw error;
    }

    const authorMap = await loadAuthors(
      [...new Set((data ?? []).map((comment: any) => comment.author_id).filter(Boolean))],
    );

    return (data ?? []).map((row: any) =>
      toCommentResponseDTO(row, authorMap.get(row.author_id)),
    );
  },

  async create(payload: CreateCommentDTO): Promise<CommentResponseDTO> {
    logger.info("CommentService.create: start", {
      companyId: payload.company_id,
      projectId: payload.project_id,
      authorId: payload.author_id,
    });

    const { data, error } = await supabaseAdmin
      .from("comments")
      .insert(payload)
      .select(
        "id, company_id, project_id, task_id, author_id, content, timestamp, updated_at"
      )
      .single();

    if (error) {
      logger.error("CommentService.create: supabase error", { error });
      throw error;
    }

    const authorMap = await loadAuthors([data.author_id]);
    const comment = toCommentResponseDTO(data, authorMap.get(data.author_id));

    commentRealtimeService.emit({
      type: "comment.created",
      company_id: comment.company_id,
      project_id: comment.project_id,
      comment,
    });

    return comment;
  },

  async update(
    id: string,
    companyId: string,
    authorId: string,
    payload: UpdateCommentDTO
  ): Promise<CommentResponseDTO | null> {
    logger.info("CommentService.update: start", {
      id,
      companyId,
      authorId,
    });

    const { data, error } = await supabaseAdmin
      .from("comments")
      .update(payload)
      .eq("id", id)
      .eq("company_id", companyId)
      .eq("author_id", authorId)
      .select(
        "id, company_id, project_id, task_id, author_id, content, timestamp, updated_at"
      )
      .maybeSingle();

    if (error) {
      logger.error("CommentService.update: supabase error", { error });
      throw error;
    }

    if (!data) return null;

    const authorMap = await loadAuthors([data.author_id]);
    const comment = toCommentResponseDTO(data, authorMap.get(data.author_id));

    commentRealtimeService.emit({
      type: "comment.updated",
      company_id: comment.company_id,
      project_id: comment.project_id,
      comment,
    });

    return comment;
  },

  async deleteById(
    id: string,
    companyId: string,
  ): Promise<{ projectId: string | null }> {
    logger.info("CommentService.deleteById: start", { id, companyId });

    const { data: existingComment, error: lookupError } = await supabaseAdmin
      .from("comments")
      .select("id, project_id")
      .eq("id", id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (lookupError) {
      logger.error("CommentService.deleteById: lookup error", { lookupError });
      throw lookupError;
    }

    const { error } = await supabaseAdmin
      .from("comments")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) {
      logger.error("CommentService.deleteById: supabase error", { error });
      throw error;
    }

    if (existingComment?.project_id) {
      commentRealtimeService.emit({
        type: "comment.deleted",
        company_id: companyId,
        project_id: existingComment.project_id,
        commentId: id,
      });
    }

    return {
      projectId: existingComment?.project_id ?? null,
    };
  },
};
