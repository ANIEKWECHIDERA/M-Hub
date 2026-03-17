import { supabaseAdmin } from "../config/supabaseClient";
import { logger } from "../utils/logger";
import { RequestCacheService } from "./requestCache.service";

type WorkspaceSummary = {
  companyId: string;
  name: string;
  logoUrl: string | null;
  role: string;
  access: string;
  status: string;
  isActive: boolean;
};

export const WorkspaceService = {
  async listForUser(userId: string, activeCompanyId?: string | null) {
    logger.info("WorkspaceService.listForUser:start", {
      userId,
      activeCompanyId,
    });

    const { data, error } = await supabaseAdmin
      .from("team_members")
      .select(
        "company_id, role, access, status, companies(id, name, logo_url)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error("WorkspaceService.listForUser:error", { error, userId });
      throw error;
    }

    const workspaces: WorkspaceSummary[] = (data ?? []).map((row: any) => ({
      companyId: row.company_id,
      name: row.companies?.name ?? "Workspace",
      logoUrl: row.companies?.logo_url ?? null,
      role: row.role,
      access: row.access,
      status: row.status,
      isActive: row.company_id === activeCompanyId,
    }));

    return workspaces;
  },

  async switchWorkspace(userId: string, companyId: string) {
    logger.info("WorkspaceService.switchWorkspace:start", {
      userId,
      companyId,
    });

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("team_members")
      .select("id, company_id, status")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (membershipError) {
      logger.error("WorkspaceService.switchWorkspace:membership error", {
        membershipError,
      });
      throw new Error("Failed to verify workspace membership");
    }

    if (!membership || membership.status !== "active") {
      throw new Error("You do not belong to this workspace");
    }

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        company_id: companyId,
        has_company: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      logger.error("WorkspaceService.switchWorkspace:update error", {
        updateError,
      });
      throw new Error("Failed to switch workspace");
    }

    logger.info("WorkspaceService.switchWorkspace:success", {
      userId,
      companyId,
    });

    RequestCacheService.invalidateUserContext({ userId });

    return { companyId };
  },
};
