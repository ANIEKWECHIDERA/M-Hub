import { Request, Response } from "express";
import { CommentService } from "../services/comment.service";
import { CreateCommentDTO, UpdateCommentDTO } from "../types/comment.types";
import { logger } from "../utils/logger";

export const CommentController = {
  async getCommentsByProject(req: any, res: Response) {
    const { projectId } = req.params;
    const companyId = req.user.company_id;

    try {
      logger.info("getCommentsByProject: fetching comments", {
        projectId,
        companyId,
      });

      const comments = await CommentService.findByProject(projectId, companyId);

      return res.json(comments);
    } catch (error) {
      logger.error("getCommentsByProject: failed", {
        projectId,
        companyId,
        error,
      });

      return res.status(500).json({ error: "Failed to fetch comments" });
    }
  },

  async createComment(req: any, res: Response) {
    const companyId = req.user.company_id;
    const authorId = req.user.user_id;

    const payload: CreateCommentDTO = {
      ...req.body,
      company_id: companyId,
      author_id: authorId,
    };

    try {
      logger.info("createComment: creating comment", {
        companyId,
        authorId,
        projectId: payload.project_id,
      });

      const comment = await CommentService.create(payload);

      return res.status(201).json(comment);
    } catch (error) {
      logger.error("createComment: failed", {
        companyId,
        payload,
        error,
      });

      return res.status(500).json({ error: "Failed to create comment" });
    }
  },

  async updateComment(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;
    const authorId = req.user.user_id;

    const payload: UpdateCommentDTO = req.body;

    try {
      logger.info("updateComment: updating comment", {
        id,
        companyId,
        authorId,
      });

      const updatedComment = await CommentService.update(
        id,
        companyId,
        authorId,
        payload
      );

      if (!updatedComment) {
        return res.status(403).json({
          error: "You can only edit your own comments",
        });
      }

      return res.json(updatedComment);
    } catch (error) {
      logger.error("updateComment: failed", {
        id,
        companyId,
        authorId,
        error,
      });

      return res.status(500).json({ error: "Failed to update comment" });
    }
  },

  async deleteComment(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;

    try {
      logger.info("deleteComment: deleting comment", {
        id,
        companyId,
      });

      await CommentService.deleteById(id, companyId);

      return res.json({ success: true });
    } catch (error) {
      logger.error("deleteComment: failed", {
        id,
        companyId,
        error,
      });

      return res.status(500).json({ error: "Failed to delete comment" });
    }
  },
};
