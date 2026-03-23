import { Response } from "express";
import { RetentionService } from "../services/retention.service";
import { logger } from "../utils/logger";

export const DashboardController = {
  async retention(req: any, res: Response) {
    const companyId = req.user?.company_id;
    const userId = req.user?.id ?? req.user?.user_id;
    const access = req.user?.access ?? null;

    if (!companyId || !userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const snapshot = await RetentionService.getDashboardSnapshot({
        companyId,
        userId,
        access,
      });

      return res.json(snapshot);
    } catch (error: any) {
      logger.error("DashboardController.retention:error", {
        error: error.message,
        companyId,
        userId,
        access,
      });
      return res
        .status(500)
        .json({ error: error.message || "Failed to load dashboard snapshot" });
    }
  },
};
