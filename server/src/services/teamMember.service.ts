import { supabaseAdmin } from "../config/supabaseClient";
import { PROFILE_STATUS_DATA } from "../dbSelect/profileStatus.select";
import { TEAM_MEMBER_SELECT } from "../dbSelect/teamMember.select";
import { toTeamMemberResponseDTO } from "../mapper/teamMemberRespose.DTO";
import { RequestCacheService } from "./requestCache.service";
import { ChatService } from "./chat.service";
import {
  CreateTeamMemberDTO,
  UpdateTeamMemberDTO,
  TeamMemberResponseDTO,
} from "../types/teamMember.types";
import { logger } from "../utils/logger";
import { TeamMemberHttpError } from "./teamMemberErrors";

async function countActiveSuperAdmins(companyId: string) {
  const { count, error } = await supabaseAdmin
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("access", "superAdmin")
    .eq("status", "active");

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function assertNotRemovingLastSuperAdmin(params: {
  companyId: string;
  memberId: string;
  nextAccess?: string | null;
  nextStatus?: string | null;
  deleting?: boolean;
}) {
  const { data: existingMember, error } = await supabaseAdmin
    .from("team_members")
    .select("id, access, status")
    .eq("company_id", params.companyId)
    .eq("id", params.memberId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!existingMember) {
    return;
  }

  const currentIsActiveSuperAdmin =
    existingMember.access === "superAdmin" && existingMember.status === "active";
  if (!currentIsActiveSuperAdmin) {
    return;
  }

  const nextAccess = params.nextAccess ?? existingMember.access;
  const nextStatus = params.nextStatus ?? existingMember.status;
  const remainsActiveSuperAdmin =
    !params.deleting &&
    nextAccess === "superAdmin" &&
    nextStatus === "active";

  if (remainsActiveSuperAdmin) {
    return;
  }

  const superAdminCount = await countActiveSuperAdmins(params.companyId);
  if (superAdminCount <= 1) {
    throw new TeamMemberHttpError(
      409,
      "At least one active super admin must remain in the workspace",
      "LAST_SUPERADMIN_REQUIRED",
    );
  }
}

async function syncUserWorkspaceState(userId?: string | null) {
  if (!userId) {
    return;
  }

  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from("team_members")
    .select("company_id, status, created_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (membershipError) {
    throw membershipError;
  }

  const activeMembership = memberships?.[0] ?? null;

  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({
      has_company: Boolean(activeMembership),
      company_id: activeMembership?.company_id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    throw updateError;
  }
}

export const TeamMemberService = {
  async getOnboardingState(firebaseUid: string) {
    const requestPath = "/api/status";
    const cachedState = RequestCacheService.getOnboardingState(firebaseUid, {
      requestPath,
    });

    if (cachedState) {
      return cachedState;
    }

    // Fetch user with team member relation
    const { data, error } = await supabaseAdmin
      .from("users")
      .select(PROFILE_STATUS_DATA)
      .eq("firebase_uid", firebaseUid)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error("USER_NOT_FOUND");
    }

    const profileComplete = data.profile_complete;
    const memberships = data.team_members ?? [];
    const hasCompany = Boolean(data.has_company || memberships.length > 0);
    const activeMembership =
      memberships.find((member: any) => member.company_id === data.company_id) ??
      memberships[0] ??
      null;

    // Compute onboarding state
    let onboardingState: string;

    if (!profileComplete) {
      onboardingState = "AUTHENTICATED_NO_PROFILE";
    } else if (profileComplete && !hasCompany) {
      onboardingState = "PROFILE_COMPLETE_NO_COMPANY";
    } else {
      onboardingState = "ACTIVE";
    }

    // Extract team member data (if exists)
    const result = {
      onboardingState,
      profileComplete,
      hasCompany,
      access: activeMembership?.access ?? null,
      companyId: activeMembership?.company_id ?? data.company_id ?? null,
    };

    RequestCacheService.setOnboardingState(firebaseUid, result, {
      requestPath,
    });

    return result;
  },

  async findAll(companyId: string): Promise<TeamMemberResponseDTO[]> {
    logger.info("TeamMemberService.findAll: start", { companyId });

    const { data, error } = await supabaseAdmin
      .from("team_members")
      .select(TEAM_MEMBER_SELECT)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map(toTeamMemberResponseDTO);
  },

  async findById(
    companyId: string,
    id: string,
  ): Promise<TeamMemberResponseDTO | null> {
    logger.info("TeamMemberService.findById: start", { companyId, id });

    const { data, error } = await supabaseAdmin
      .from("team_members")
      .select(TEAM_MEMBER_SELECT)
      .eq("company_id", companyId)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    return data ? toTeamMemberResponseDTO(data) : null;
  },

  async create(payload: CreateTeamMemberDTO): Promise<TeamMemberResponseDTO> {
    logger.info("TeamMemberService.create: start", {
      company_id: payload.company_id,
      email: payload.email,
    });

    const { data, error } = await supabaseAdmin
      .from("team_members")
      .insert({
        ...payload,
        access: payload.access ?? "team_member",
        status: payload.status ?? "active",
      })
      .select(TEAM_MEMBER_SELECT)
      .single();

    if (error) throw error;

    await syncUserWorkspaceState(data?.user_id);
    RequestCacheService.invalidateUserContext({
      userId: data?.user_id,
    });
    if (data?.user_id && data?.status === "active") {
      await ChatService.ensureGeneralConversation(data.company_id);
    }

    return toTeamMemberResponseDTO(data);
  },

  async update(
    companyId: string,
    id: string,
    payload: UpdateTeamMemberDTO,
  ): Promise<TeamMemberResponseDTO | null> {
    logger.info("TeamMemberService.update: start", { companyId, id });

    await assertNotRemovingLastSuperAdmin({
      companyId,
      memberId: id,
      nextAccess: payload.access ?? null,
      nextStatus: payload.status ?? null,
    });

    const { data: existingMember, error: existingMemberError } = await supabaseAdmin
      .from("team_members")
      .select("user_id")
      .eq("company_id", companyId)
      .eq("id", id)
      .maybeSingle();

    if (existingMemberError) throw existingMemberError;

    const { data, error } = await supabaseAdmin
      .from("team_members")
      .update(payload)
      .eq("company_id", companyId)
      .eq("id", id)
      .select(TEAM_MEMBER_SELECT)
      .maybeSingle();

    if (error) throw error;

    const affectedUserIds = new Set<string>();
    if (existingMember?.user_id) {
      affectedUserIds.add(existingMember.user_id);
    }
    if (data?.user_id) {
      affectedUserIds.add(data.user_id);
    }

    for (const userId of affectedUserIds) {
      await syncUserWorkspaceState(userId);
      RequestCacheService.invalidateUserContext({
        userId,
      });
    }

    if (data?.user_id && data?.status === "active") {
      await ChatService.ensureGeneralConversation(companyId);
    } else if (existingMember?.user_id) {
      await ChatService.deactivateCompanyMembershipChats({
        companyId,
        userId: existingMember.user_id,
      });
    }

    return data ? toTeamMemberResponseDTO(data) : null;
  },

  async deleteById(companyId: string, id: string): Promise<void> {
    logger.info("TeamMemberService.deleteById: start", { companyId, id });

    await assertNotRemovingLastSuperAdmin({
      companyId,
      memberId: id,
      deleting: true,
    });

    const { data, error: lookupError } = await supabaseAdmin
      .from("team_members")
      .select("user_id")
      .eq("company_id", companyId)
      .eq("id", id)
      .maybeSingle();

    if (lookupError) throw lookupError;

    const { error } = await supabaseAdmin
      .from("team_members")
      .delete()
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) throw error;

    await syncUserWorkspaceState(data?.user_id);
    RequestCacheService.invalidateUserContext({
      userId: data?.user_id,
    });
    await ChatService.deactivateCompanyMembershipChats({
      companyId,
      userId: data?.user_id,
    });
  },
};
