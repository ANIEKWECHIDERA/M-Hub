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

    const { data: memberships, error } = await supabaseAdmin
      .from("team_members")
      .select("company_id, role, access, status")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error("WorkspaceService.listForUser:error", { error, userId });
      throw error;
    }

    const companyIds = Array.from(
      new Set(
        (memberships ?? [])
          .map((row: any) => row.company_id)
          .filter(Boolean),
      ),
    );

    let companiesById = new Map<string, { name: string | null; logo_url: string | null }>();

    if (companyIds.length) {
      const { data: companies, error: companiesError } = await supabaseAdmin
        .from("companies")
        .select("id, name, logo_url")
        .in("id", companyIds);

      if (companiesError) {
        logger.error("WorkspaceService.listForUser:companies error", {
          companiesError,
          userId,
          companyIds,
        });
        throw companiesError;
      }

      companiesById = new Map(
        (companies ?? []).map((company: any) => [
          company.id,
          {
            name: company.name ?? null,
            logo_url: company.logo_url ?? null,
          },
        ]),
      );
    }

    const workspaces: WorkspaceSummary[] = (memberships ?? []).map((row: any) => {
      const company = companiesById.get(row.company_id);

      return {
        companyId: row.company_id,
        name: company?.name ?? "Workspace",
        logoUrl: company?.logo_url ?? null,
        role: row.role,
        access: row.access,
        status: row.status,
        isActive: row.company_id === activeCompanyId,
      };
    });

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
