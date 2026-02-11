import { Request, Response, NextFunction } from "express";
import admin from "../config/firebaseAdmin";
import { logger } from "../utils/logger";
import { AppUser } from "../types/types";
import { supabaseAdmin } from "../config/supabaseClient";

export default async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    logger.warn("Missing or malformed Authorization header", {
      path: req.path,
      method: req.method,
    });
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    // 🔐 Verify token + revocation in one call
    const decoded = await admin.auth().verifyIdToken(token, true);

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("firebase_uid", decoded.uid)
      .single();

    if (error || !user) {
      logger.warn("User not found in database", { uid: decoded.uid });
      return res.status(401).json({ error: error?.message || "Unauthorized" });
    }

    // TEMP TEST VALUES (replace later)
    const appUser: AppUser = {
      ...decoded,
      company_id: "3b72e747-22d9-40b6-9445-8308253923c1",
      role: "superAdmin",
      // user_id: "f1052280-a2b1-46f7-ab37-f1a83659c3f7",
      user_id: "5e563f43-a627-4e54-a216-5ab607b16a31",
    };

    // const appUser: AppUser = {
    //   ...decoded,
    //   company_id: user.company_id,
    //   role: user.role,
    //   user_id: user.user_id,
    // };

    req.user = appUser;

    logger.info("Authenticated user", {
      uid: decoded.uid,
      user_id: appUser.user_id,
      company_id: appUser.company_id,
      role: appUser.role,
    });

    next();
  } catch (error: any) {
    logger.error("Authentication failed", {
      error: error?.message,
      path: req.path,
      method: req.method,
    });

    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
