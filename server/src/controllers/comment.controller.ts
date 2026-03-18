import { Request, Response } from "express";
import { CommentService } from "../services/comment.service";
import admin from "../config/firebaseAdmin";
import { NotificationService } from "../services/notification.service";
import { commentRealtimeService } from "../services/commentRealtime.service";
import { RequestCacheService } from "../services/requestCache.service";
import { UserService } from "../services/user.service";
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

      await NotificationService.createCommentNotifications({
        companyId,
        projectId: comment.project_id,
        taskId: comment.task_id,
        commentText: comment.content,
        authorUserId: authorId,
      });

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

  async streamComments(req: Request, res: Response) {
    const token = String(req.query.token ?? "").trim();
    const projectId = String(req.query.projectId ?? "").trim();

    if (!token || !projectId) {
      return res.status(401).json({ error: "Missing comment stream params" });
    }

    try {
      const decoded =
        RequestCacheService.getVerifiedToken(token, {
          requestPath: req.path,
        }) ??
        (await admin.auth().verifyIdToken(token, true));
      RequestCacheService.setVerifiedToken(token, decoded, {
        requestPath: req.path,
      });

      const cachedUser = RequestCacheService.getUser(decoded.uid, {
        requestPath: req.path,
      });
      const user =
        cachedUser ?? (await UserService.findByFirebaseUid(decoded.uid));

      if (!user?.company_id) {
        return res.status(403).json({ error: "Comment stream unavailable" });
      }

      if (!cachedUser && user) {
        RequestCacheService.setUser(decoded.uid, user, {
          requestPath: req.path,
        });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      const writeEvent = (event: string, data: unknown) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      writeEvent("connected", {
        companyId: user.company_id,
        projectId,
      });

      const unsubscribe = commentRealtimeService.subscribe(
        user.company_id,
        projectId,
        (event) => {
          writeEvent("comment", event);
        },
      );

      const keepAlive = setInterval(() => {
        writeEvent("ping", { ts: new Date().toISOString() });
      }, 25000);

      req.on("close", () => {
        clearInterval(keepAlive);
        unsubscribe();
        res.end();
      });
    } catch (error: any) {
      logger.error("CommentController.streamComments failed", {
        error: error.message,
        projectId,
      });

      return res.status(401).json({ error: "Invalid or expired token" });
    }
  },
};
