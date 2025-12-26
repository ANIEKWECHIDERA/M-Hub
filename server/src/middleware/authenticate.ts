import { Request, Response, NextFunction } from "express";
import admin from "../config/firebaseAdmin";
import { logger } from "../utils/logger";
import { AppUser } from "../types/types";

declare global {
  namespace Express {
    interface Request {
      user?: AppUser;
    }
  }
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

    // TEMPORARY HARDCODE (easy to replace later)
    const appUser: AppUser = {
      ...decoded,
      company_id: "3b72e747-22d9-40b6-9445-8308253923c1",
      role: "team_member",
      user_id: "3b72e747-22d9-40b6-9445-8308253923c1",
    };

    req.user = appUser;

    logger.info("Authenticated user", {
      uid: decoded.uid,
      company_id: appUser.company_id,
      role: appUser.role,
      user_id: appUser.user_id,
    });

    next();
  } catch (err) {
    logger.error("Token verification failed:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
