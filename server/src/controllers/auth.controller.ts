import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import admin, { revokeUserTokens } from "../config/firebaseAdmin";
import { SyncUserDTO, DeleteFirebaseUserDTO } from "../types/auth.types";
import { logger } from "../utils/logger";

export const AuthController = {
  /**
   * Sync Firebase user → internal user record
   * Called on first login
   */
  async syncUser(req: Request & { user: any }, res: Response) {
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload: SyncUserDTO = req.body;

    try {
      logger.info("AuthController.syncUser", { firebaseUid });

      const existingUser = await UserService.findByFirebaseUid(firebaseUid);

      if (existingUser) {
        return res.json({ profile: existingUser });
      }

      const user = await UserService.createFromAuth({
        firebase_uid: firebaseUid,
        email: payload.email ?? req.user.email,
        display_name: payload.name ?? req.user.displayName,
        photo_url: payload.avatar ?? req.user.photoURL,
      });

      return res.status(201).json({ profile: user });
    } catch (error: any) {
      logger.error("AuthController.syncUser failed", {
        firebaseUid,
        error,
      });
      return res.status(500).json({ error: "Failed to sync user" });
    }
  },

  /**
   * Logout user and revoke Firebase tokens
   */
  async logout(req: Request & { user: any }, res: Response) {
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      logger.info("AuthController.logout", { firebaseUid });

      await revokeUserTokens(firebaseUid);

      return res.json({
        message: "Successfully logged out and revoked tokens",
      });
    } catch (error: any) {
      logger.error("AuthController.logout failed", {
        firebaseUid,
        error,
      });
      return res.status(500).json({ error: "Logout failed" });
    }
  },

  /**
   * Delete Firebase user
   * ⚠️ Should be ADMIN / INTERNAL ONLY
   */
  async deleteFirebaseUser(req: Request, res: Response) {
    const payload: DeleteFirebaseUserDTO = req.body;

    if (!payload.uid) {
      return res.status(400).json({ error: "UID is required" });
    }

    try {
      logger.warn("AuthController.deleteFirebaseUser", {
        uid: payload.uid,
      });

      await admin.auth().deleteUser(payload.uid);

      logger.info("Firebase user deleted", { uid: payload.uid });

      return res.status(200).json({
        message: "User deleted successfully",
      });
    } catch (error: any) {
      logger.error("AuthController.deleteFirebaseUser failed", {
        uid: payload.uid,
        error,
      });

      return res.status(500).json({ error: "Failed to delete user" });
    }
  },
};
