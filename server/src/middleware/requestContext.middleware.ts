import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger";

const getClientIp = (req: Request): string | undefined => {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0]?.trim();
  }

  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0];
  }

  return req.ip;
};

export const requestContext = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const existingRequestId = req.header("x-request-id");
  const requestId = existingRequestId || crypto.randomUUID();
  const startTime = process.hrtime.bigint();

  req.requestId = requestId;
  req.log = logger.child({
    requestId,
    method: req.method,
    path: req.originalUrl || req.path,
  });

  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;

    req.log?.info("HTTP request completed", {
      requestId,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      companyId: req.user?.company_id ?? null,
      userId: req.user?.id ?? null,
      firebaseUid: req.user?.firebase_uid ?? null,
      ip: getClientIp(req) ?? null,
      userAgent: req.get("user-agent") ?? null,
    });
  });

  next();
};
