import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { supabaseAdmin } from "../config/supabaseClient";

export async function resolveTeamMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;

  if (!user?.user_id || !user?.company_id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("team_members")
      .select("id")
      .eq("user_id", user.user_id)
      .eq("company_id", user.company_id)
      .single();

    if (error || !data) {
      logger.warn("Team member not found", {
        user_id: user.user_id,
        company_id: user.company_id,
      });

      return res.status(403).json({
        error: "User is not a team member of this company",
      });
    }

    // 🔑 Attach ONCE to request
    req.user!.team_member_id = data.id;

    logger.info("Resolved team member", {
      team_member_id: data.id,
      user_id: user.user_id,
    });

    next();
  } catch (err) {
    logger.error("Failed to resolve team member", { err });
    next(err);
  }
}
