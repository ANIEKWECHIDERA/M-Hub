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

  // Step 1: Log if Authorization header is missing or malformed
  if (!authHeader?.startsWith("Bearer ")) {
    logger.warn("authenticate: Missing or malformed Authorization header", {
      path: req.path,
      method: req.method,
    });
    return res.status(401).json({ error: "authenticate: Unauthorized" });
  }

  // Step 2: Extract token from the Authorization header
  const token = authHeader.replace("Bearer ", "");

  try {
    // Step 3: Verify the token with Firebase
    // logger.info("authenticate: Verifying token", { token });

    const decoded = await admin.auth().verifyIdToken(token, true);
    logger.info("authenticate: Token verified", { uid: decoded.uid });

    // Step 4: Check if the user exists in Supabase
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("firebase_uid", decoded.uid)
      .single();

    // Log user lookup result
    logger.info("authenticate: Supabase user lookup result", {
      firebase_uid: user?.firebase_uid,
      email: user?.email,
      error,
    });

    if (error || !user) {
      logger.warn("Authenticate: User not found in database", {
        uid: decoded.uid,
      });
      return res
        .status(401)
        .json({ error: error?.message || "authenticate: Unauthorized" });
    }

    // Step 5: Check if the user is a team member in Supabase
    const { data: teamMember, error: teamMemberError } = await supabaseAdmin
      .from("team_members")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Log team member lookup result
    logger.info("authenticate: Supabase team member lookup result", {
      teamMember,
      teamMemberError,
    });

    if (teamMemberError || !teamMember) {
      logger.warn("Authenticate: Team member not found in database", {
        uid: decoded.uid,
      });
      return res
        .status(401)
        .json({ error: teamMemberError?.message || "Unauthorized" });
    }

    // Step 6: Set the user data on the request object for use in controllers
    const appUser: AppUser = {
      ...decoded,
      team_member_id: teamMember.id,
      access: teamMember.access,
      company_id: teamMember.company_id,
      role: "superAdmin", // TEMP role, should be fetched from DB
      user_id: "5e563f43-a627-4e54-a216-5ab607b16a31", // TEMP user_id
      email: user.email,
    };

    req.user = { ...decoded, ...user, ...teamMember } as AppUser;

    logger.info("authenticate: Authenticated user", {
      uid: decoded.uid,
      user_id: appUser.user_id,
      company_id: appUser.company_id,
      role: appUser.role,
    });

    // Step 7: Proceed to next middleware or route handler
    next();
  } catch (error: any) {
    // Step 8: Log any errors in the authentication process
    logger.error("authenticate: Authentication failed", {
      error: error?.message,
      path: req.path,
      method: req.method,
    });

    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
