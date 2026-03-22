import { supabaseAdmin } from "../config/supabaseClient";
import { logger } from "../utils/logger";
import { RequestCacheService } from "./requestCache.service";
import { prisma } from "../lib/prisma";

type WorkspaceSummary = {
  companyId: string;
  name: string;
  logoUrl: string | null;
  role: string;
  access: string;
  status: string;
  isActive: boolean;
};

type WorkspaceManagerSnapshot = {
  workspace: {
    id: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    createdAt: string;
    memberCount: number;
  };
  owner: {
    id: string | null;
    name: string;
    email: string;
    avatar: string | null;
  } | null;
  workload: Array<{
    id: string;
    userId: string | null;
    name: string;
    email: string;
    role: string;
    avatar: string | null;
    assignedTaskCount: number;
    completedTaskCount: number;
    overdueTaskCount: number;
    inProgressTaskCount: number;
    capacityStatus: "free" | "balanced" | "overloaded" | "behind";
  }>;
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

  async getManagerSnapshot(companyId: string): Promise<WorkspaceManagerSnapshot> {
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id, name, description, logo_url, created_at")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      throw new Error("Workspace not found");
    }

    const { data: members, error: membersError } = await supabaseAdmin
      .from("team_members")
      .select(
        "id, user_id, email, access, role, status, users(id, display_name, first_name, last_name, photo_url, avatar)",
      )
      .eq("company_id", companyId)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (membersError) {
      throw new Error("Failed to load workspace members");
    }

    const ownerMember =
      (members ?? []).find(
        (member: any) =>
          member.access === "superAdmin" && member.role === "owner",
      ) ??
      (members ?? []).find((member: any) => member.access === "superAdmin") ??
      null;

    const workloadRows = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT
        tm.id,
        tm.user_id,
        tm.email,
        tm.role,
        COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.display_name, tm.email) AS name,
        COALESCE(u.avatar, u.photo_url) AS avatar,
        COUNT(DISTINCT t.id) AS assigned_task_count,
        COUNT(DISTINCT CASE WHEN t.status = 'Done' THEN t.id END) AS completed_task_count,
        COUNT(DISTINCT CASE WHEN t.due_date IS NOT NULL AND t.due_date < NOW() AND t.status <> 'Done' THEN t.id END) AS overdue_task_count,
        COUNT(DISTINCT CASE WHEN t.status IN ('In Progress', 'Review') THEN t.id END) AS in_progress_task_count
      FROM team_members tm
      LEFT JOIN users u ON u.id = tm.user_id
      LEFT JOIN task_team_member_assignees ta ON ta.team_member_id = tm.id
      LEFT JOIN tasks t ON t.id = ta.task_id AND t.company_id = ${companyId}::uuid
      WHERE tm.company_id = ${companyId}::uuid
        AND tm.status = 'active'
      GROUP BY tm.id, tm.user_id, tm.email, tm.role, u.first_name, u.last_name, u.display_name, u.avatar, u.photo_url
      ORDER BY name ASC`;

    const workload = workloadRows.map((row: Record<string, any>) => {
      const assignedTaskCount = Number(row.assigned_task_count ?? 0);
      const completedTaskCount = Number(row.completed_task_count ?? 0);
      const overdueTaskCount = Number(row.overdue_task_count ?? 0);
      const inProgressTaskCount = Number(row.in_progress_task_count ?? 0);

      let capacityStatus: "free" | "balanced" | "overloaded" | "behind" = "balanced";
      if (overdueTaskCount > 0) {
        capacityStatus = "behind";
      } else if (assignedTaskCount >= 8 || inProgressTaskCount >= 5) {
        capacityStatus = "overloaded";
      } else if (assignedTaskCount <= 2 && inProgressTaskCount <= 1) {
        capacityStatus = "free";
      }

      return {
        id: row.id,
        userId: row.user_id ?? null,
        name: row.name,
        email: row.email,
        role: row.role,
        avatar: row.avatar ?? null,
        assignedTaskCount,
        completedTaskCount,
        overdueTaskCount,
        inProgressTaskCount,
        capacityStatus,
      };
    });

    const ownerUser = Array.isArray(ownerMember?.users)
      ? ownerMember?.users[0]
      : ownerMember?.users;

    return {
      workspace: {
        id: company.id,
        name: company.name,
        description: company.description ?? null,
        logoUrl: company.logo_url ?? null,
        createdAt: company.created_at,
        memberCount: members?.length ?? 0,
      },
      owner: ownerMember
        ? {
            id: ownerMember.user_id ?? null,
            name:
              [ownerUser?.first_name, ownerUser?.last_name]
                .filter(Boolean)
                .join(" ") ||
              ownerUser?.display_name ||
              ownerMember.email,
            email: ownerMember.email,
            avatar:
              ownerUser?.avatar ??
              ownerUser?.photo_url ??
              null,
          }
        : null,
      workload,
    };
  },
};
