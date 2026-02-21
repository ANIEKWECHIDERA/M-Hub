import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabaseClient";
import { logger } from "../utils/logger";
import { AppUser } from "../types/types";

export async function requireAppUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    logger.warn("requireAppUser: No user on request");
    return res.status(401).json({ error: "requireAppUser: Unauthorized" });
  }

  const userId = req.user?.id;

  if (!userId) {
    logger.warn("requireAppUser: Missing DB user");
    return res.status(401).json({ error: "requireAppUser: Unauthorized" });
  }

  const { data: teamMember, error } = await supabaseAdmin
    .from("team_members")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !teamMember) {
    logger.warn("requireAppUser: Team member not found", {
      user_id: userId,
    });
    return res
      .status(403)
      .json({ error: "requireAppUser: User not assigned to company" });
  }

  const appUser: AppUser = {
    ...req.user,
    team_member_id: teamMember.id,
    access: teamMember.access,
    company_id: teamMember.company_id,
    role: teamMember.role,
    user_id: userId,
    email: req.user?.email,
  };

  req.user = appUser;

  logger.info("requireAppUser: User fully authenticated", {
    user_id: userId,
    company_id: teamMember.company_id,
    access: teamMember.access,
  });

  next();
}
