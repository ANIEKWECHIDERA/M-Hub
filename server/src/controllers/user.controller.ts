// controllers/user.controller.ts
import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import { logger } from "../utils/logger";

export const UserController = {
  async getUser(req: any, res: Response) {
    logger.info("getUser: Fetching for firebase_uid:", req.user.uid); // Log incoming UID
    const user = await UserService.findByFirebaseUid(req.user.uid);
    if (!user) {
      console.info("getUser: Profile not found for UID:", req.user.uid);
      return res.status(404).json({ error: "Profile not found" });
    }
    logger.info("getUser: Found profile:", user);
    res.json({ profile: user });
  },

  async updateUser(req: any, res: Response) {
    logger.info(
      "updateUser: Updating for firebase_uid:",
      req.user.uid,
      "with data:",
      req.body
    );
    const updated = await UserService.updateByFirebaseUid(
      req.user.uid,
      req.body
    );
    logger.info("updateUser: Updated profile:", updated);
    res.json({ profile: updated });
  },

  async deleteUser(req: any, res: Response) {
    logger.info("deleteUser: Deleting for firebase_uid:", req.user.uid);
    await UserService.deleteByFirebaseUid(req.user.uid);
    res.json({ success: true });
  },

  async createUser(req: any, res: Response) {
    const { firstName, lastName, email, firebase_uid } = req.body;
    logger.info("createUser: Creating with data:", {
      firstName,
      lastName,
      email,
      firebase_uid,
    });
    if (!email || !firebase_uid)
      return res.status(400).json({ error: "Missing data" });

    const user = await UserService.createOrUpdate({
      firebase_uid,
      email,
      first_name: firstName,
      last_name: lastName,
      display_name: `${firstName} ${lastName}`,
    });
    logger.info("createUser: Created/updated profile:", user);
    res.json({ profile: user });
  },
};
