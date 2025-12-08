// controllers/user.controller.ts
import { Request, Response } from "express";
import { UserService } from "../services/user.service";

export const UserController = {
  async getUser(req: any, res: Response) {
    const user = await UserService.findByFirebaseUid(req.user.uid);
    if (!user) return res.status(404).json({ error: "Profile not found" });
    res.json({ profile: user });
  },

  async updateUser(req: any, res: Response) {
    const updated = await UserService.updateByFirebaseUid(
      req.user.uid,
      req.body
    );
    res.json({ profile: updated });
  },

  async deleteUser(req: any, res: Response) {
    await UserService.deleteByFirebaseUid(req.user.uid);
    res.json({ success: true });
  },

  async createUser(req: any, res: Response) {
    const { firstName, lastName, email, firebase_uid } = req.body;
    if (!email || !firebase_uid)
      return res.status(400).json({ error: "Missing data" });

    const user = await UserService.createOrUpdate({
      firebase_uid,
      email,
      first_name: firstName,
      last_name: lastName,
      display_name: `${firstName} ${lastName}`,
    });

    res.json({ profile: user });
  },
};
