import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabaseClient";
import { RequestCacheService } from "../services/requestCache.service";
import { logger } from "../utils/logger";
import { UserService } from "../services/user.service";

export async function profileSync(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    logger.warn("profileSync: No user on request");
    return res.status(401).json({ error: "Unauthorized" });
  }

  const firebaseUid = req.user?.uid;

  if (!firebaseUid) {
    logger.warn("profileSync: Missing firebase_uid on request");
    return res.status(401).json({ error: "Unauthorized" });
  }

  const cachedUser = RequestCacheService.getUser(firebaseUid);

  if (cachedUser) {
    void UserService.touchLastLoginIfNeeded({
      firebaseUid,
      userId: cachedUser.id,
      lastLogin: cachedUser.last_login,
    }).catch((touchError: any) => {
      logger.warn("profileSync: Failed to update last login", {
        firebaseUid,
        error: touchError?.message ?? touchError,
      });
    });

    req.user = {
      ...req.user,
      ...cachedUser,
    };

    return next();
  }

  let { data: user, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("firebase_uid", firebaseUid)
    .single();

  if (error && error.code !== "PGRST116") {
    logger.error("profileSync: DB lookup error", { error });
    return res.status(500).json({ error: "Network error" });
  }

  if (!user) {
    try {
      user = await UserService.createFromAuth({
        firebase_uid: firebaseUid,
        email: req.user.email,
        display_name: req.user.name,
        photo_url: req.user.avatar ?? req.user?.picture,
      });
    } catch (err: any) {
      logger.error("profileSync: Unexpected failure", {
        error: err.message,
      });

      return res.status(500).json({ error: "Profile sync failed" });
    }

    if (!user) {
      logger.error("profileSync: User creation failed");
      return res.status(500).json({ error: "User creation failed" });
    }

  }

  // Attach DB user to request
  req.user = {
    ...req.user,
    ...user,
  };
  RequestCacheService.setUser(firebaseUid, user);

  void UserService.touchLastLoginIfNeeded({
    firebaseUid,
    userId: user.id,
    lastLogin: user.last_login,
  }).catch((touchError: any) => {
    logger.warn("profileSync: Failed to update last login", {
      firebaseUid,
      error: touchError?.message ?? touchError,
    });
  });

  next();
}
