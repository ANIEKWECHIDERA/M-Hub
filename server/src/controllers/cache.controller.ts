import { Request, Response } from "express";
import { RequestCacheService } from "../services/requestCache.service";
import { logger } from "../utils/logger";

export const CacheController = {
  getMetrics(req: Request, res: Response) {
    try {
      const metrics = RequestCacheService.getMetricsSnapshot();
      const generatedAt = new Date().toISOString();

      logger.info("CacheController.getMetrics", {
        requestedBy: req.user?.id ?? req.user?.user_id ?? null,
        generatedAt,
      });

      return res.json({ generatedAt, metrics });
    } catch (error) {
      logger.error("CacheController.getMetrics failed", { error });
      return res.status(500).json({ error: "Failed to fetch cache metrics" });
    }
  },
};
