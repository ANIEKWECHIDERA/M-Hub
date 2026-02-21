import { Response } from "express";
import { UserService } from "../services/user.service";
import { logger } from "../utils/logger";
import { AuthenticatedRequest } from "../types/express";
import { CreateUserDTO, UpdateUserDTO } from "../dtos/user.dto";

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
    const parsed = UpdateUserDTO.safeParse(req.body);
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
    const updated = await UserService.updateByFirebaseUid(
      req.user.uid,
      parsed.data,
    );
    logger.info("UserController.updateUser end", {
      firebaseUid: req.user.uid,
      updatedUser: updated,
    });
    return res.json({ profile: updated });
  },

  async deleteUser(req: AuthenticatedRequest, res: Response) {
    await UserService.deleteByFirebaseUid(req.user.uid);

    logger.info("User deleted", {
      firebase_uid: req.user.uid,
    });

    return res.json({ success: true });
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

    const { firstName, lastName } = parsed.data;

    const firebase_uid = req.user.uid;
    const email = req.user.email ?? parsed.data.email;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      const [existingByUid, existingByEmail] = await Promise.all([
        UserService.findByFirebaseUid(firebase_uid),
        UserService.findByEmail(email),
      ]);

      if (existingByUid || existingByEmail) {
        return res.status(409).json({
          error: "User already exists",
        });
      }

      const user = await UserService.create({
        firebase_uid,
        email,
        first_name: firstName,
        last_name: lastName,
        display_name: `${firstName} ${lastName}`,
        terms_accepted: true,
        terms_accepted_at: new Date(),
      });

      logger.info("User created", {
        user_id: user.id,
        firebase_uid,
      });

      return res.status(201).json({ profile: user });
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
