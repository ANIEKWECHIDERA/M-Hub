import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import admin, { revokeUserTokens } from "../config/firebaseAdmin";
import { SyncUserDTO, DeleteFirebaseUserDTO } from "../types/auth.types";
import { logger } from "../utils/logger";
import { TeamMemberService } from "../services/teamMember.service";
import { sendPublicError } from "../utils/httpErrors";

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
      return sendPublicError(req, res, {
        status: 401,
        error: "Unauthorized",
        code: "AUTH_REQUIRED",
      });
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
      return sendPublicError(req, res, {
        status: 500,
        error: "Failed to sync user",
        code: "AUTH_SYNC_FAILED",
      });
    }
  },

  /**
   * check if user has company and profile complete
   */

  async checkProfileComplete(req: Request, res: Response) {
    const firebaseUid = req.user?.firebase_uid ?? req.user?.uid;
    logger.info("checkProfileComplete: Received request", {
      firebaseUid,
      userId: req.user?.id ?? req.user?.user_id ?? null,
      path: req.path,
    });
    if (!firebaseUid) {
      logger.warn("checkProfileComplete: Firebase UID is missing in request", {
        path: req.path,
        userId: req.user?.id ?? req.user?.user_id ?? null,
      });
      return sendPublicError(req, res, {
        status: 401,
        error: "Unauthorized",
        code: "AUTH_REQUIRED",
      });
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
        return sendPublicError(req, res, {
          status: 404,
          error: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      return sendPublicError(req, res, {
        status: 500,
        error: "Failed to check onboarding state",
        code: "AUTH_STATUS_FAILED",
      });
    }
  },

  /**
   * Logout user and revoke Firebase tokens
   */

  async logout(req: Request, res: Response) {
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      return sendPublicError(req, res, {
        status: 401,
        error: "Unauthorized",
        code: "AUTH_REQUIRED",
      });
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
      return sendPublicError(req, res, {
        status: 500,
        error: "Logout failed",
        code: "LOGOUT_FAILED",
      });
    }
  },

  /**
   * Delete Firebase user
   * ⚠️ Should be ADMIN / INTERNAL ONLY
   */
  async deleteFirebaseUser(req: Request, res: Response) {
    const payload: DeleteFirebaseUserDTO = req.body;
    const authenticatedUid = req.user?.uid;

    if (!payload.uid) {
      return sendPublicError(req, res, {
        status: 400,
        error: "UID is required",
        code: "UID_REQUIRED",
      });
    }

    if (!authenticatedUid) {
      return sendPublicError(req, res, {
        status: 401,
        error: "Unauthorized",
        code: "AUTH_REQUIRED",
      });
    }

    if (payload.uid !== authenticatedUid) {
      logger.warn("AuthController.deleteFirebaseUser denied uid mismatch", {
        authenticatedUid,
        requestedUid: payload.uid,
      });

      return sendPublicError(req, res, {
        status: 403,
        error:
          "You can only remove the orphaned account tied to your current sign-up session.",
        code: "UID_MISMATCH",
      });
    }

    try {
      logger.warn("AuthController.deleteFirebaseUser", {
        uid: payload.uid,
        authenticatedUid,
      });

      await admin.auth().deleteUser(payload.uid);

      logger.info("Firebase user deleted", { uid: payload.uid });

      logger.info("AuthController.deleteFirebaseUser completed", {
        uid: payload.uid,
      });

      return res.status(200).json({
        message: "User deleted successfully",
      });
    } catch (error: any) {
      logger.error("AuthController.deleteFirebaseUser failed", {
        uid: payload.uid,
        error,
      });

      return sendPublicError(req, res, {
        status: 500,
        error: "Failed to delete user",
        code: "FIREBASE_DELETE_FAILED",
      });
    }
  },
};
