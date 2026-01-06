import { supabaseAdmin } from "../config/supabaseClient";
import {
  CreateTeamMemberDTO,
  UpdateTeamMemberDTO,
  TeamMemberResponseDTO,
} from "../types/teamMember.types";
import { logger } from "../utils/logger";

function toTeamMemberResponseDTO(row: any): TeamMemberResponseDTO {
  return {
    id: row.id,
    user_id: row.user_id,
    company_id: row.company_id,
    email: row.email,
    role: row.role,
    access: row.access,
    status: row.status,
    last_login: row.last_login,
    created_at: row.created_at,
  };
}

export const TeamMemberService = {
  async findAll(companyId: string): Promise<TeamMemberResponseDTO[]> {
    logger.info("TeamMemberService.findAll: start", { companyId });

    const { data, error } = await supabaseAdmin
      .from("team_members")
      .select(
        "id, user_id, company_id, email, role, access, status, last_login, created_at"
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map(toTeamMemberResponseDTO);
  },

  async findById(
    companyId: string,
    id: string
  ): Promise<TeamMemberResponseDTO | null> {
    logger.info("TeamMemberService.findById: start", { companyId, id });

    const { data, error } = await supabaseAdmin
      .from("team_members")
      .select(
        "id, user_id, company_id, email, role, access, status, last_login, created_at"
      )
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
      .select(
        "id, user_id, company_id, email, role, access, status, last_login, created_at"
      )
      .single();

    if (error) throw error;

    return toTeamMemberResponseDTO(data);
  },

  async update(
    companyId: string,
    id: string,
    payload: UpdateTeamMemberDTO
  ): Promise<TeamMemberResponseDTO | null> {
    logger.info("TeamMemberService.update: start", { companyId, id });

    const { data, error } = await supabaseAdmin
      .from("team_members")
      .update(payload)
      .eq("company_id", companyId)
      .eq("id", id)
      .select(
        "id, user_id, company_id, email, role, access, status, last_login, created_at"
      )
      .maybeSingle();

    if (error) throw error;

    return data ? toTeamMemberResponseDTO(data) : null;
  },

  async deleteById(companyId: string, id: string): Promise<void> {
    logger.info("TeamMemberService.deleteById: start", { companyId, id });

    const { error } = await supabaseAdmin
      .from("team_members")
      .delete()
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) throw error;
  },
};
