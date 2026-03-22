import { Request, Response } from "express";
import { ZodError } from "zod";
import { frontendLogSchema } from "../dtos/frontendLog.dto";
import { frontendLogger } from "../utils/logger";

const FRONTEND_LOG_INGEST_ENABLED =
  process.env.ENABLE_FRONTEND_LOG_INGEST?.toLowerCase() === "true" ||
  (process.env.ENABLE_FRONTEND_LOG_INGEST == null &&
    (process.env.NODE_ENV ?? "development") !== "production");
const FRONTEND_LOG_SAMPLE_RATE = Math.min(
  1,
  Math.max(
    0,
    Number.parseFloat(
      process.env.FRONTEND_LOG_SAMPLE_RATE ??
        ((process.env.NODE_ENV ?? "development") === "production" ? "0.25" : "1"),
    ),
  ),
);

const sanitizeMeta = (meta: Record<string, unknown>) => {
  const trimmedEntries = Object.entries(meta).slice(0, 20);

  return Object.fromEntries(
    trimmedEntries.map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.slice(0, 2000)];
      }

      return [key, value];
    }),
  );
};

export const FrontendLogController = {
  async create(req: Request, res: Response) {
    try {
      if (!FRONTEND_LOG_INGEST_ENABLED) {
        return res.status(202).json({ success: true, skipped: "disabled" });
      }

      const payload = frontendLogSchema.parse(req.body);

      if (FRONTEND_LOG_SAMPLE_RATE < 1 && Math.random() > FRONTEND_LOG_SAMPLE_RATE) {
        return res.status(202).json({ success: true, skipped: "sampled_out" });
      }

      frontendLogger.log(payload.level, payload.message, {
        type: payload.type,
        component: payload.component ?? null,
        path: payload.path ?? null,
        href: payload.href ?? null,
        userAgent: payload.userAgent ?? req.get("user-agent") ?? null,
        stack: payload.stack ?? null,
        meta: sanitizeMeta(payload.meta),
        requestId: req.requestId ?? null,
        ip: req.ip,
      });

      return res.status(202).json({ success: true });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Invalid frontend log payload",
          details: error.flatten(),
        });
      }

      return res.status(500).json({ error: "Failed to persist frontend log" });
    }
  },
};
