// src/controllers/invite.controller.ts
import { Request, Response } from "express";
import { InviteService } from "../services/invite.service";
import { NotificationService } from "../services/notification.service";
import { logger } from "../utils/logger";

export const InviteController = {
  async sendInvite(req: Request, res: Response) {
    const userId = req.user?.id;
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const role = String(req.body?.role ?? "").trim();
    const access = String(req.body?.access ?? "team_member").trim();

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
      const { invite, token } = await InviteService.createInvite(
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

      const frontendBaseUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
      const inviteLink = `${frontendBaseUrl}/invite/accept/${token}`;

      logger.info(`Simulated Mail:

You have been invited to join a company on M-Hub.

Please use the link below to accept the invitation.
The link expires in 24 hours.

${inviteLink}
`);

      return res.status(200).json({
        message: "invite sent successfully",
        inviteId: invite.id,
      });
    } catch (err: any) {
      logger.error("InviteController.sendInvite: unexpected error", {
        error: err.message,
        stack: err.stack,
      });
      return res.status(400).json({ error: err.message });
    }
  },

  async acceptInvite(req: Request, res: Response) {
    const userId = req.user?.id;
    const token = String(req.body?.token ?? "").trim();

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
      const result = await InviteService.acceptInvite(token, userId);

      await NotificationService.createInviteAcceptedNotifications({
        companyId: result.companyId,
        acceptedUserId: userId,
        acceptedEmail: req.user?.email ?? "A user",
      });

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

  async declineInvite(req: Request, res: Response) {
    const token = String(req.body?.token ?? "").trim();

    if (!token) {
      return res.status(400).json({ error: "Invite token is required" });
    }

    try {
      await InviteService.declineInvite(token);
      return res.status(200).json({ message: "Invite declined successfully" });
    } catch (error: any) {
      logger.error("InviteController.declineInvite: error", {
        error: error.message,
      });

      return res.status(400).json({ error: error.message });
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
