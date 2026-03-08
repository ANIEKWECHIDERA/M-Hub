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

  async getInvites(req: Request, res: Response) {
    const userId = req.user?.id;

    logger.info("InviteController.getInvites: start", { userId });

    if (!userId) {
      logger.warn("InviteController.getInvites: missing user ID");
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const invites = await InviteService.getInvites(userId);

      logger.info("InviteController.getInvites: success", {
        count: invites?.length,
      });

      return res.status(200).json({
        invites,
      });
    } catch (error: any) {
      logger.error("InviteController.getInvites: unexpected error", {
        error: error.message,
      });

      return res.status(500).json({
        error: "Failed to fetch invites",
        details: error.message,
      });
    }
  },

  async cancelInvite(req: Request, res: Response) {
    const userId = req.user?.id;
    const { inviteId } = req.params;

    logger.info("InviteController.cancelInvite: start", {
      userId,
      inviteId,
    });

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!inviteId) {
      return res.status(400).json({ error: "Invite ID is required" });
    }

    try {
      await InviteService.cancelInvite(inviteId, userId);

      logger.info("InviteController.cancelInvite: success", {
        inviteId,
      });

      return res.status(200).json({
        message: "Invite cancelled successfully",
      });
    } catch (error: any) {
      logger.error("InviteController.cancelInvite: error", {
        error: error.message,
      });

      return res.status(400).json({
        error: error.message,
      });
    }
  },

  async cancelInvites(req: Request, res: Response) {
    const userId = req.user?.id;
    const { inviteIds } = req.body;

    logger.info("InviteController.cancelInvites: start", {
      userId,
      inviteIds,
    });

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!inviteIds || !Array.isArray(inviteIds) || inviteIds.length === 0) {
      return res.status(400).json({
        error: "inviteIds array is required",
      });
    }

    try {
      const result = await InviteService.cancelInvites(inviteIds, userId);

      logger.info("InviteController.cancelInvites: success", {
        cancelled: result.cancelled,
      });

      return res.status(200).json({
        message: "Invites cancelled successfully",
        cancelled: result.cancelled,
      });
    } catch (error: any) {
      logger.error("InviteController.cancelInvites: error", {
        error: error.message,
      });

      return res.status(400).json({
        error: error.message,
      });
    }
  },
};
