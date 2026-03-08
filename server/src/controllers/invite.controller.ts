// src/controllers/invite.controller.ts
import { Request, Response } from "express";
import { InviteService } from "../services/invite.service";
import { logger } from "../utils/logger";

export const InviteController = {
  async sendInvite(req: Request, res: Response) {
    const userId = req.user?.id;
    const { email, access, role } = req.body;

    logger.info("InviteController.sendInvite: start", { userId, email });

    if (!userId) {
      logger.warn("InviteController.sendInvite: missing user ID in request");
      return res.status(401).json({ error: "Unauthorized: missing user ID" });
    }

    if (!email) {
      logger.warn("InviteController.sendInvite: missing email in request", {
        userId,
      });
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      // Create the invite
      const invite = await InviteService.createInvite(
        email,
        userId,
        role,
        access ?? "team_member",
      );

      logger.info("InviteController.sendInvite: invite sent successfully", {
        inviteId: invite.id,
        email,
      });

      // TODO: send email notification here
      const inviteLink = `www.M-Hub.com/accept-invite/${invite.token}`;

      logger.info(
        `Simulated Mail:
        
        You have been invited to join a Company on M-Hub, Please use the attached link to accept invitation. The link expires in the next 24Hrs
      
      ${inviteLink}`,
      );

      return res.status(200).json({
        message: "invite sent successfully",
        inviteId: invite.id,
      });
    } catch (err: any) {
      logger.error("InviteController.sendInvite: unexpected error", {
        error: err.message,
        stack: err.stack,
      });
      return res
        .status(500)
        .json({ error: "Failed to send invite", details: err.message });
    }
  },

  async acceptInvite(req: Request, res: Response) {
    const userId = req.user?.id;
    const { token, accessLevel } = req.body;

    logger.info("InviteController.acceptInvite: start", {
      userId,
      token,
    });

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!token) {
      return res.status(400).json({ error: "Invite token is required" });
    }

    try {
      const result = await InviteService.acceptInvite(
        token,
        userId,
        accessLevel,
      );

      return res.status(200).json({
        message: "Invite accepted successfully",
        companyId: result.companyId,
      });
    } catch (error: any) {
      logger.error("InviteController.acceptInvite: error", {
        error: error.message,
      });

      return res.status(400).json({
        error: error.message,
      });
    }
  },
};
