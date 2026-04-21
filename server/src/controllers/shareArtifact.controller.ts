import { Request, Response } from "express";
import {
  ShareArtifactService,
  ShareArtifactValidationError,
} from "../services/shareArtifact.service";
import { logger } from "../utils/logger";

function getRequestUser(req: Request) {
  return {
    companyId: req.user?.company_id,
    userId: req.user?.id ?? req.user?.user_id,
    access: req.user?.access ?? null,
  };
}

function handleShareArtifactError(
  res: Response,
  error: any,
  context: Record<string, unknown>,
) {
  if (error instanceof ShareArtifactValidationError) {
    return res.status(error.status).json({ error: error.message });
  }

  logger.error("ShareArtifactController:error", {
    ...context,
    error: error?.message ?? error,
  });

  return res.status(500).json({
    error: error?.message || "Failed to load share artifact",
  });
}

export const ShareArtifactController = {
  async decisionTimeline(req: Request, res: Response) {
    const { companyId, userId, access } = getRequestUser(req);

    if (!companyId || !userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const artifact = await ShareArtifactService.getDecisionTimeline({
        companyId,
        userId,
        from: req.query.from,
        to: req.query.to,
        conversationId: req.query.conversationId,
        limit: req.query.limit,
      });

      return res.json(artifact);
    } catch (error: any) {
      return handleShareArtifactError(res, error, {
        endpoint: "decisionTimeline",
        companyId,
        userId,
        access,
      });
    }
  },

  async workspaceSnapshot(req: Request, res: Response) {
    const { companyId, userId, access } = getRequestUser(req);

    if (!companyId || !userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (access !== "admin" && access !== "superAdmin") {
      return res.status(403).json({
        error: "Workspace snapshots are available to admins and super admins.",
        code: "FORBIDDEN_ACTION",
      });
    }

    try {
      const artifact = await ShareArtifactService.getWorkspaceSnapshot({
        companyId,
        from: req.query.from,
        to: req.query.to,
      });

      return res.json(artifact);
    } catch (error: any) {
      return handleShareArtifactError(res, error, {
        endpoint: "workspaceSnapshot",
        companyId,
        userId,
        access,
      });
    }
  },
};
