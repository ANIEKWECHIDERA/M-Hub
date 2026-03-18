import { Request, Response } from "express";
import crypto from "crypto";
import admin from "../config/firebaseAdmin";
import { NotificationService } from "../services/notification.service";
import { notificationRealtimeService } from "../services/notificationRealtime.service";
import { RequestCacheService } from "../services/requestCache.service";
import { logger } from "../utils/logger";

function getNotificationUser(req: any) {
  return {
    companyId: req.user.company_id,
    userId: req.user.user_id ?? req.user.id,
  };
}

function normalizeNotificationLimit(rawLimit: unknown) {
  const parsed = Number(rawLimit ?? 50);

  if (!Number.isFinite(parsed)) {
    return 50;
  }

  return Math.min(100, Math.max(1, Math.trunc(parsed)));
}

function buildNotificationEtag(params: {
  companyId: string;
  userId: string;
  limit: number;
  payload: unknown;
}) {
  const hash = crypto
    .createHash("sha1")
    .update(JSON.stringify(params))
    .digest("hex");

  return `"notif-${hash}"`;
}

function normalizeEtag(value: string | string[] | undefined) {
  if (!value) {
    return "";
  }

  const raw = Array.isArray(value) ? value[0] : value;
  return raw.replace(/^W\//, "");
}

export const NotificationController = {
  async getMyNotifications(req: any, res: Response) {
    const { companyId, userId } = getNotificationUser(req);
    const limit = normalizeNotificationLimit(req.query.limit);

    try {
      const cachedResponse = RequestCacheService.getNotificationResponse(
        companyId,
        userId,
        limit,
        { requestPath: req.path },
      );

      if (
        cachedResponse &&
        normalizeEtag(req.headers["if-none-match"]) === cachedResponse.etag
      ) {
        res.setHeader("ETag", cachedResponse.etag);
        res.setHeader(
          "Cache-Control",
          "private, no-cache, max-age=0, must-revalidate",
        );
        return res.status(304).end();
      }

      if (cachedResponse) {
        res.setHeader("ETag", cachedResponse.etag);
        res.setHeader(
          "Cache-Control",
          "private, no-cache, max-age=0, must-revalidate",
        );
        return res.json(cachedResponse.payload);
      }

      const [notifications, unreadCount] = await Promise.all([
        NotificationService.findByUser(companyId, userId, limit),
        NotificationService.getUnreadCount(companyId, userId),
      ]);

      const payload = {
        notifications,
        unreadCount,
      };
      const etag = buildNotificationEtag({
        companyId,
        userId,
        limit,
        payload,
      });

      RequestCacheService.setNotificationResponse(companyId, userId, limit, {
        etag,
        payload,
      }, {
        requestPath: req.path,
      });

      res.setHeader("ETag", etag);
      res.setHeader(
        "Cache-Control",
        "private, no-cache, max-age=0, must-revalidate",
      );

      return res.json(payload);
    } catch (error) {
      logger.error("NotificationController.getMyNotifications failed", {
        companyId,
        userId,
        error,
      });

      return res.status(500).json({ error: "Failed to fetch notifications" });
    }
  },

  async getUnreadCount(req: any, res: Response) {
    const { companyId, userId } = getNotificationUser(req);

    try {
      const unreadCount = await NotificationService.getUnreadCount(
        companyId,
        userId,
      );

      return res.json({ unreadCount });
    } catch (error) {
      logger.error("NotificationController.getUnreadCount failed", {
        companyId,
        userId,
        error,
      });

      return res.status(500).json({ error: "Failed to fetch unread count" });
    }
  },

  async markNotificationRead(req: any, res: Response) {
    const { id } = req.params;
    const { companyId, userId } = getNotificationUser(req);

    try {
      logger.info("NotificationController.markNotificationRead", {
        id,
        companyId,
        userId,
      });

      const notification = await NotificationService.markAsRead(
        id,
        companyId,
        userId,
      );

      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      const unreadCount = await NotificationService.getUnreadCount(
        companyId,
        userId,
      );

      return res.json({ notification, unreadCount });
    } catch (error) {
      logger.error("NotificationController.markNotificationRead failed", {
        id,
        companyId,
        userId,
        error,
      });

      return res.status(500).json({ error: "Failed to update notification" });
    }
  },

  async markAllNotificationsRead(req: any, res: Response) {
    const { companyId, userId } = getNotificationUser(req);

    try {
      await NotificationService.markAllAsRead(companyId, userId);

      return res.json({ unreadCount: 0 });
    } catch (error) {
      logger.error("NotificationController.markAllNotificationsRead failed", {
        companyId,
        userId,
        error,
      });

      return res.status(500).json({ error: "Failed to update notifications" });
    }
  },

  async streamNotifications(req: Request, res: Response) {
    const token = String(req.query.token ?? "").trim();

    if (!token) {
      return res.status(401).json({ error: "Missing notification token" });
    }

    try {
      const decoded =
        RequestCacheService.getVerifiedToken(token, {
          requestPath: req.path,
        }) ??
        (await admin.auth().verifyIdToken(token, true));
      RequestCacheService.setVerifiedToken(token, decoded, {
        requestPath: req.path,
      });
      const user = await NotificationService.getStreamUser(decoded.uid);

      if (!user?.id || !user.company_id) {
        return res.status(403).json({ error: "Notification stream unavailable" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      const writeEvent = (event: string, data: unknown) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      writeEvent("connected", {
        userId: user.id,
        companyId: user.company_id,
      });

      const unsubscribe = notificationRealtimeService.subscribe(
        user.id,
        user.company_id,
        (event) => {
          writeEvent("notification", event);
        },
      );

      const keepAlive = setInterval(() => {
        writeEvent("ping", { ts: new Date().toISOString() });
      }, 25000);

      req.on("close", () => {
        clearInterval(keepAlive);
        unsubscribe();
        res.end();
      });
    } catch (error: any) {
      logger.error("NotificationController.streamNotifications failed", {
        error: error.message,
      });

      return res.status(401).json({ error: "Invalid or expired token" });
    }
  },
};
