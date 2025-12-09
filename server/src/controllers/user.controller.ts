// controllers/user.controller.ts
import { Request, Response } from "express";
import { UserService } from "../services/user.service";

export const UserController = {
  async getUser(req: any, res: Response) {
    console.log("getUser: Fetching for firebase_uid:", req.user.uid); // Log incoming UID
    const user = await UserService.findByFirebaseUid(req.user.uid);
    if (!user) {
      console.log("getUser: Profile not found for UID:", req.user.uid);
      return res.status(404).json({ error: "Profile not found" });
    }
    console.log("getUser: Found profile:", user);
    res.json({ profile: user });
  },

  async updateUser(req: any, res: Response) {
    console.log(
      "updateUser: Updating for firebase_uid:",
      req.user.uid,
      "with data:",
      req.body
    );
    const updated = await UserService.updateByFirebaseUid(
      req.user.uid,
      req.body
    );
    console.log("updateUser: Updated profile:", updated);
    res.json({ profile: updated });
  },

  async deleteUser(req: any, res: Response) {
    console.log("deleteUser: Deleting for firebase_uid:", req.user.uid);
    await UserService.deleteByFirebaseUid(req.user.uid);
    res.json({ success: true });
  },

  async createUser(req: any, res: Response) {
    const { firstName, lastName, email, firebase_uid } = req.body;
    console.log("createUser: Creating with data:", {
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
    console.log("createUser: Created/updated profile:", user);
    res.json({ profile: user });
  },
};
