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
    const { firstName, lastName, email, firebase_uid, termsAccepted } =
      req.body;

    // Log received data safely
    logger.info(
      "createUser: Creating with data: " +
        JSON.stringify({
          firstName,
          lastName,
          email,
          firebase_uid,
          termsAccepted,
        })
    );

    // Validate required fields
    const missingFields: string[] = [];
    if (!email) missingFields.push("email");
    if (!firebase_uid) missingFields.push("firebase_uid");
    if (termsAccepted !== true) missingFields.push("termsAccepted");

    if (missingFields.length > 0) {
      logger.warn(
        "createUser: Missing required fields: " + JSON.stringify(missingFields)
      );
      return res.status(400).json({
        error: "Missing or invalid required data",
        missingFields,
      });
    }

    try {
      // Check for existing user by firebase_uid
      const existingByUid = await UserService.findByFirebaseUid(firebase_uid);
      if (existingByUid) {
        logger.warn(`createUser: Duplicate firebase_uid detected`);
        return res.status(409).json({
          error: "User with this firebase_uid already exists",
        });
      }

      // Check for existing user by email
      const existingByEmail = await UserService.findByEmail(email);
      if (existingByEmail) {
        logger.warn(`createUser: Duplicate email detected`);
        return res.status(409).json({
          error: "User with this email already exists",
        });
      }

      // Create new user
      const user = await UserService.create({
        firebase_uid,
        email,
        first_name: firstName,
        last_name: lastName,
        display_name: `${firstName} ${lastName}`,
        terms_accepted: true,
        terms_accepted_at: new Date(),
      });

      logger.info(
        "createUser: Successfully created user: " + JSON.stringify(user)
      );
      return res.status(201).json({ profile: user });
    } catch (err: any) {
      logger.error("createUser: Error creating user:", err);
      return res.status(500).json({
        error: "Failed to create user",
        details: err.message || err,
      });
    }
  },
};
