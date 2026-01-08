import { Response } from "express";
import { UserSettingsService } from "../services/userSettings.service";
import { UpdateUserSettingsDTO } from "../types/userSettings.types";
import { logger } from "../utils/logger";

export const UserSettingsController = {
  async getMySettings(req: any, res: Response) {
    const userId = req.user.user_id;

    try {
      logger.info("getMySettings", { userId });

      const settings = await UserSettingsService.findOrCreate(userId);

      return res.json(settings);
    } catch (error) {
      logger.error("getMySettings failed", { userId, error });
      return res.status(500).json({ error: "Failed to fetch user settings" });
    }
  },

  async updateMySettings(req: any, res: Response) {
    const userId = req.user.user_id;
    const payload: UpdateUserSettingsDTO = req.body;

    try {
      logger.info("updateMySettings", { userId, payload });

      const settings = await UserSettingsService.update(userId, payload);

      return res.json(settings);
    } catch (error) {
      logger.error("updateMySettings failed", { userId, error });
      return res.status(500).json({ error: "Failed to update user settings" });
    }
  },
};
