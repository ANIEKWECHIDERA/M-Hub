import { Request, Response, NextFunction } from "express";
import admin from "../config/firebaseAdmin";
import type { auth } from "firebase-admin";
import { logger } from "../utils/logger";

declare global {
  namespace Express {
    interface Request {
      user?: auth.DecodedIdToken;
    }
  }
}

export interface AuthRequest extends Request {
  user?: auth.DecodedIdToken;
}

export default async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);

    // Check revocation
    const userRecord = await admin.auth().getUser(decoded.uid);
    const tokensValidAfterTime = userRecord.tokensValidAfterTime
      ? new Date(userRecord.tokensValidAfterTime).getTime() / 1000
      : 0;

    if (decoded.auth_time < tokensValidAfterTime) {
      return res.status(401).json({ error: "Token has been revoked" });
    }
    req.user = decoded;
    logger.info(decoded); // Attach decoded Firebase user
    next();
  } catch (err) {
    logger.error("Token verification failed:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
