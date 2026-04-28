import { Response } from "express";
import { UserService } from "../services/user.service";
import { MediaService } from "../services/media.service";
import { logger } from "../utils/logger";
import { AuthenticatedRequest } from "../types/authenticatedRequest";
import { CreateUserDTO, UpdateUserDTO } from "../dtos/user.dto";
import { isTeamMemberHttpError } from "../services/teamMemberErrors";
import { sendPublicError } from "../utils/httpErrors";

export const UserController = {
  async getUser(req: AuthenticatedRequest, res: Response) {
    const firebaseUid = req.user.uid;

    const user = await UserService.findByFirebaseUid(firebaseUid);
    if (!user) {
      return sendPublicError(req, res, {
        status: 404,
        error: "Profile not found",
        code: "PROFILE_NOT_FOUND",
      });
    }

    return res.json({ profile: user });
  },

  async updateUser(req: AuthenticatedRequest, res: Response) {
    logger.info("UserController.updateUser start", {
      firebaseUid: req.user.uid,
      body: req.body,
    });

    const normalizedBody = {
      ...req.body,
      profile_complete:
        typeof req.body?.profile_complete === "string"
          ? req.body.profile_complete === "true"
          : req.body?.profile_complete,
      terms_accepted:
        typeof req.body?.terms_accepted === "string"
          ? req.body.terms_accepted === "true"
            ? true
            : undefined
          : req.body?.terms_accepted,
    };

    const parsed = UpdateUserDTO.safeParse(normalizedBody);
    if (!parsed.success) {
      return sendPublicError(req, res, {
        status: 400,
        error: "Invalid update payload",
        code: "USER_UPDATE_INVALID",
        details: parsed.error.flatten(),
      });
    }

    logger.info("UserController.updateUser parsed", {
      firebaseUid: req.user.uid,
      parsedData: parsed.data,
    });

    const updates: typeof parsed.data & { terms_accepted_at?: string } = {
      ...parsed.data,
    };
    const hasAcceptedTerms =
      updates.terms_accepted === true || !!req.user.terms_accepted;

    if (updates.profile_complete && !hasAcceptedTerms) {
      return sendPublicError(req, res, {
        status: 400,
        error: "Terms must be accepted before completing profile",
        code: "TERMS_REQUIRED",
      });
    }

    if (updates.terms_accepted) {
      updates.terms_accepted_at = new Date().toISOString();
    }

    if (req.file) {
      const upload = await MediaService.uploadImage(
        req.file,
        `users/${req.user.id ?? req.user.uid}`,
        "avatar",
      );
      updates.photo_url = upload.secure_url;
    }

    const updated = await UserService.updateByFirebaseUid(req.user.uid, updates);

    logger.info("UserController.updateUser end", {
      firebaseUid: req.user.uid,
      updatedUser: updated,
    });

    return res.json({ profile: updated });
  },

  async deleteUser(req: AuthenticatedRequest, res: Response) {
    try {
      await UserService.deleteByFirebaseUid(req.user.uid);

      logger.info("User deleted", {
        firebase_uid: req.user.uid,
      });

      return res.json({ success: true });
    } catch (error) {
      if (isTeamMemberHttpError(error)) {
        return sendPublicError(req, res, {
          status: error.statusCode,
          error: error.message,
          code: error.code,
        });
      }

      throw error;
    }
  },

  async createUser(req: AuthenticatedRequest, res: Response) {
    if (!req.user?.uid) {
      return sendPublicError(req, res, {
        status: 401,
        error: "Unauthorized",
        code: "AUTH_REQUIRED",
      });
    }

    const parsed = CreateUserDTO.safeParse(req.body);
    if (!parsed.success) {
      return sendPublicError(req, res, {
        status: 400,
        error: "Invalid request data",
        code: "USER_CREATE_INVALID",
        details: parsed.error.flatten(),
      });
    }

    const trimmedFirstName = parsed.data.firstName.trim();
    const trimmedLastName = parsed.data.lastName.trim();
    const firebase_uid = req.user.uid;
    const email = req.user.email ?? parsed.data.email;

    if (!email) {
      return sendPublicError(req, res, {
        status: 400,
        error: "Email is required",
        code: "EMAIL_REQUIRED",
      });
    }

    try {
      const existingByEmail = await UserService.findByEmail(email);

      if (existingByEmail && existingByEmail.firebase_uid !== firebase_uid) {
        return sendPublicError(req, res, {
          status: 409,
          error: "A user with this email already exists",
          code: "USER_EMAIL_EXISTS",
        });
      }

      const user = await UserService.completeSignupProfile({
        firebase_uid,
        email,
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        display_name: `${trimmedFirstName} ${trimmedLastName}`,
        terms_accepted: true,
        terms_accepted_at: new Date(),
      });

      logger.info("User created", {
        user_id: user.id,
        firebase_uid,
      });

      return res.status(201).json({
        success: true,
        profile: user,
      });
    } catch (error: any) {
      logger.error("User creation failed", {
        firebase_uid,
        error: error.message,
      });

      return sendPublicError(req, res, {
        status: 500,
        error: "User creation failed",
        code: "USER_CREATE_FAILED",
      });
    }
  },
};
