import { Request, Response } from "express";
import { WorkspaceService } from "../services/workspace.service";
import { logger } from "../utils/logger";

export const WorkspaceController = {
  async list(req: Request, res: Response) {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const workspaces = await WorkspaceService.listForUser(
        userId,
        req.user?.company_id,
      );
      return res.json({ workspaces });
    } catch (error: any) {
      logger.error("WorkspaceController.list:error", {
        error: error.message,
        userId,
      });
      return res.status(500).json({ error: "Failed to load workspaces" });
    }
  },

  async switch(req: Request, res: Response) {
    const userId = req.user?.id;
    const companyId = String(req.body?.companyId ?? "").trim();

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!companyId) {
      return res.status(400).json({ error: "companyId is required" });
    }

    try {
      const result = await WorkspaceService.switchWorkspace(userId, companyId);
      return res.json({ success: true, ...result });
    } catch (error: any) {
      logger.error("WorkspaceController.switch:error", {
        error: error.message,
        userId,
        companyId,
      });
      return res.status(400).json({ error: error.message });
    }
  },
};
