import { supabaseAdmin } from "../config/supabaseClient";
import {
  CreateCommentDTO,
  UpdateCommentDTO,
  CommentResponseDTO,
} from "../types/comment.types";
import { logger } from "../utils/logger";

function toCommentResponseDTO(row: any): CommentResponseDTO {
  return {
    id: row.id,
    company_id: row.company_id,
    project_id: row.project_id,
    task_id: row.task_id,
    author_id: row.author_id,
    content: row.content,
    timestamp: row.timestamp,
    updated_at: row.updated_at,
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

    return data.map(toCommentResponseDTO);
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

    return toCommentResponseDTO(data);
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

    return data ? toCommentResponseDTO(data) : null;
  },

  async deleteById(id: string, companyId: string): Promise<void> {
    logger.info("CommentService.deleteById: start", { id, companyId });

    const { error } = await supabaseAdmin
      .from("comments")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) {
      logger.error("CommentService.deleteById: supabase error", { error });
      throw error;
    }
  },
};
