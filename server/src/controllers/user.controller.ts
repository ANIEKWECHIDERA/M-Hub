import { Response } from "express";
import { UserService } from "../services/user.service";
import { MediaService } from "../services/media.service";
import { logger } from "../utils/logger";
import { AuthenticatedRequest } from "../types/authenticatedRequest";
import { CreateUserDTO, UpdateUserDTO } from "../dtos/user.dto";
import { isTeamMemberHttpError } from "../services/teamMemberErrors";

export const UserController = {
  async getUser(req: AuthenticatedRequest, res: Response) {
    const firebaseUid = req.user.uid;

    const user = await UserService.findByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ error: "Profile not found" });
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
      return res.status(400).json({
        error: "Invalid update payload",
        issues: parsed.error.flatten(),
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
      return res.status(400).json({
        error: "Terms must be accepted before completing profile",
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
        return res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
        });
      }

      throw error;
    }
  },

  async createUser(req: AuthenticatedRequest, res: Response) {
    if (!req.user?.uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parsed = CreateUserDTO.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid request data",
        issues: parsed.error.flatten(),
      });
    }

    const trimmedFirstName = parsed.data.firstName.trim();
    const trimmedLastName = parsed.data.lastName.trim();
    const firebase_uid = req.user.uid;
    const email = req.user.email ?? parsed.data.email;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      const existingByEmail = await UserService.findByEmail(email);

      if (existingByEmail && existingByEmail.firebase_uid !== firebase_uid) {
        return res.status(409).json({
          error: "A user with this email already exists",
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

      return res
        .status(500)
        .json({ error: "User creation failed", details: error.message });
    }
  },
};
