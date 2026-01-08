import { Response } from "express";
import { NotificationService } from "../services/notification.service";
import { logger } from "../utils/logger";

export const NotificationController = {
  async getMyNotifications(req: any, res: Response) {
    const companyId = req.user.company_id;
    const userId = req.user.user_id;

    try {
      logger.info("getMyNotifications", { companyId, userId });

      const notifications = await NotificationService.findByUser(
        companyId,
        userId
      );

      return res.json(notifications);
    } catch (error) {
      logger.error("getMyNotifications failed", {
        companyId,
        userId,
        error,
      });

      return res.status(500).json({ error: "Failed to fetch notifications" });
    }
  },

  async markNotificationRead(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;
    const userId = req.user.user_id;

    try {
      logger.info("markNotificationRead", {
        id,
        companyId,
        userId,
      });

      const notification = await NotificationService.markAsRead(
        id,
        companyId,
        userId
      );

      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      return res.json(notification);
    } catch (error) {
      logger.error("markNotificationRead failed", {
        id,
        companyId,
        userId,
        error,
      });

      return res.status(500).json({ error: "Failed to update notification" });
    }
  },
};
