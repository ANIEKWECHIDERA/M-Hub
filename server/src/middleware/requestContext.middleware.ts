import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger";

const SENSITIVE_QUERY_PARAMS = new Set([
  "token",
  "authorization",
  "access_token",
  "id_token",
  "refresh_token",
]);

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

const getSafeRequestPath = (req: Request): string => {
  const rawPath = req.originalUrl || req.path;

  try {
    const parsedUrl = new URL(rawPath, "http://localhost");

    for (const paramName of SENSITIVE_QUERY_PARAMS) {
      if (parsedUrl.searchParams.has(paramName)) {
        parsedUrl.searchParams.set(paramName, "[redacted]");
      }
    }

    const search = parsedUrl.searchParams.toString();
    return `${parsedUrl.pathname}${search ? `?${search}` : ""}`;
  } catch {
    return rawPath;
  }
};

export const requestContext = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const existingRequestId = req.header("x-request-id");
  const requestId = existingRequestId || crypto.randomUUID();
  const startTime = process.hrtime.bigint();
  const safePath = getSafeRequestPath(req);

  req.requestId = requestId;
  req.log = logger.child({
    requestId,
    method: req.method,
    path: safePath,
  });

  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;

    req.log?.info("HTTP request completed", {
      requestId,
      method: req.method,
      path: safePath,
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
