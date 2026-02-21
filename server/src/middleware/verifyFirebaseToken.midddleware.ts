import { Request, Response, NextFunction } from "express";
import admin from "../config/firebaseAdmin";
import { logger } from "../utils/logger";

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

    return res.status(401).json({ error: "verifyFirebaseToken: Unauthorized" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = await admin.auth().verifyIdToken(token, true);

    logger.info("verifyFirebaseToken: Token verified", {
      uid: decoded.uid,
    });

    // Attach only Firebase
    const appUser: any = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
    };

    logger.info("verifyFirebaseToken: Firebase user attached to request", {
      firebase_uid: appUser.firebase_uid,
      email: appUser.email,
    });

    req.user = appUser;

    next();
  } catch (error: any) {
    logger.error("verifyFirebaseToken: Token verification failed", {
      error: error.message,
      path: req.path,
    });

    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
