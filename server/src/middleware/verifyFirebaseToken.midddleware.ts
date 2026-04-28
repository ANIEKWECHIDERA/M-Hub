import { Request, Response, NextFunction } from "express";
import admin from "../config/firebaseAdmin";
import { RequestCacheService } from "../services/requestCache.service";
import { logger } from "../utils/logger";
import { sendPublicError } from "../utils/httpErrors";

export async function verifyFirebaseToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    logger.warn("verifyFirebaseToken: Missing Authorization header", {
      path: req.path,
      method: req.method,
    });

    return sendPublicError(req, res, {
      status: 401,
      error: "Unauthorized",
      code: "AUTH_HEADER_MISSING",
    });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded =
      RequestCacheService.getVerifiedToken(token, { requestPath: req.path }) ??
      (await admin.auth().verifyIdToken(token, true));

    RequestCacheService.setVerifiedToken(token, decoded, {
      requestPath: req.path,
    });

    // Attach only Firebase
    const appUser: any = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
    };

    req.user = appUser;

    next();
  } catch (error: any) {
    logger.error("verifyFirebaseToken: Token verification failed", {
      error: error.message,
      path: req.path,
    });

    return sendPublicError(req, res, {
      status: 401,
      error: "Invalid or expired token",
      code: "AUTH_TOKEN_INVALID",
    });
  }
}
