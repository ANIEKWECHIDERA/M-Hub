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

  const userId = req.user.id;

  if (!userId) {
    logger.warn("requireAppUser: Missing DB user");
    return res.status(401).json({ error: "requireAppUser: Unauthorized" });
  }

  let teamMember = null as any;
  let error = null as any;

  if (req.user.company_id) {
    const result = await supabaseAdmin
      .from("team_members")
      .select("*")
      .eq("user_id", userId)
      .eq("company_id", req.user.company_id)
      .maybeSingle();

    teamMember = result.data;
    error = result.error;
  }

  if (!teamMember && !error) {
    const fallback = await supabaseAdmin
      .from("team_members")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1);

    error = fallback.error;
    teamMember = fallback.data?.[0] ?? null;

    if (teamMember && req.user.company_id !== teamMember.company_id) {
      const { error: syncError } = await supabaseAdmin
        .from("users")
        .update({
          company_id: teamMember.company_id,
          has_company: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (syncError) {
        logger.warn("requireAppUser: Failed to sync active company", {
          user_id: userId,
          syncError,
        });
      } else {
        req.user.company_id = teamMember.company_id;
      }
    }
  }

  // Company creation is the one onboarding route that must be reachable
  // before a team_members row exists.
  if (
    req.method === "POST" &&
    req.path === "/company" &&
    !teamMember &&
    !error
  ) {
    logger.info("requireAppUser: Allowing onboarding company creation", {
      user_id: userId,
      path: req.path,
    });
    return next();
  }

  if (error || !teamMember) {
    logger.warn("requireAppUser: Team member not found", {
      user_id: userId,
      company_id: req.user.company_id,
      error,
    });
    return res
      .status(403)
      .json({ error: "requireAppUser: User not assigned to company" });
  }

  const appUser: AppUser = {
    ...req.user,
    id: userId,
    team_member_id: teamMember.id,
    access: teamMember.access,
    company_id: teamMember.company_id,
    role: teamMember.role,
    user_id: userId,
    email: req.user.email,
  };

  req.user = appUser;

  logger.info("requireAppUser: User fully authenticated", {
    user_id: userId,
    company_id: teamMember.company_id,
    access: teamMember.access,
  });

  next();
}
