import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import admin, { revokeUserTokens } from "../config/firebaseAdmin";
import { SyncUserDTO, DeleteFirebaseUserDTO } from "../types/auth.types";
import { logger } from "../utils/logger";
import { TeamMemberService } from "../services/teamMember.service";

export const AuthController = {
  /**
   * Sync Firebase user → internal user record
   * Called on first login
   */

  async syncUser(req: Request, res: Response) {
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      logger.warn("syncUser: Firebase UID is missing in request", {
        path: req.path,
      });
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload: SyncUserDTO = req.body;

    try {
      logger.info("syncUser start: Checking if user exists in database", {
        firebaseUid,
      });

      let user = await UserService.findByFirebaseUid(firebaseUid);

      if (!user) {
        logger.info(
          "syncUser: User not found, creating a new user from auth data",
          {
            firebaseUid,
            email: payload.email,
            display_name: payload.name,
            photo_url: payload.avatar,
          },
        );

        user = await UserService.createFromAuth({
          firebase_uid: firebaseUid,
          email: payload.email ?? req.user?.email,
          display_name: payload.name ?? req.user?.displayName,
          photo_url: payload.avatar ?? req.user?.photoURL,
        });

        logger.info("syncUser: New user created successfully", {
          firebaseUid,
          userId: user.user_id,
          userEmail: user.email,
        });
      } else {
        logger.info("syncUser: User already exists in database", {
          firebaseUid,
          userId: user.user_id,
        });
      }

      // Log the response details
      logger.info("syncUser: Returning user profile", {
        firebaseUid,
        profileComplete: user.profile_complete,
        hasCompany: user.has_company,
        role: user.role,
      });

      return res.status(201).json({
        profile: user,
        profileComplete: user.profile_complete,
        hasCompany: user.has_company,
        role: user.role,
      });
    } catch (error: any) {
      logger.error("syncUser: Failed to sync user", {
        firebaseUid,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({ error: "Failed to sync user" });
    }
  },

  /**
   * check if user has company and profile complete
   */

  async checkProfileComplete(req: Request, res: Response) {
    const firebaseUid = req.user?.firebase_uid;
    logger.info(
      "checkProfileComplete: Received request",
      { firebaseUid },
      req.user,
    );
    if (!firebaseUid) {
      logger.warn("checkProfileComplete: Firebase UID is missing in request", {
        path: req.path,
      });
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      logger.info(
        "checkProfileComplete: Checking if the user has completed the profile",
        { firebaseUid },
      );

      const result = await TeamMemberService.getOnboardingState(firebaseUid);

      if (!result) {
        logger.warn("checkProfileComplete: No onboarding state found", {
          firebaseUid,
        });
      } else {
        logger.info("checkProfileComplete: Onboarding state found", {
          firebaseUid,
          onboardingState: result.onboardingState,
          profileComplete: result.profileComplete,
          hasCompany: result.hasCompany,
        });
      }

      return res.json(result);
    } catch (error: any) {
      logger.error("checkProfileComplete: Failed to check onboarding state", {
        firebaseUid,
        error: error.message,
        stack: error.stack,
      });

      if (error.message === "USER_NOT_FOUND") {
        logger.warn("checkProfileComplete: User not found in Supabase", {
          firebaseUid,
        });
        return res.status(404).json({ error: "User not found" });
      }

      return res
        .status(500)
        .json({ error: "Failed to check onboarding state" });
    }
  },

  /**
   * Logout user and revoke Firebase tokens
   */

  async logout(req: Request, res: Response) {
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

      return (
        res.status(200).json({
          message: "User deleted successfully",
        }),
        logger.info("AuthController.deleteFirebaseUser completed", {
          uid: payload.uid,
        })
      );
    } catch (error: any) {
      logger.error("AuthController.deleteFirebaseUser failed", {
        uid: payload.uid,
        error,
      });

      return res.status(500).json({ error: "Failed to delete user" });
    }
  },
};
