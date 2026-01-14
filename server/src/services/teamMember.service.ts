import { supabaseAdmin } from "../config/supabaseClient";
import { TEAM_MEMBER_SELECT } from "../dbSelect/teamMember.select";
import { toTeamMemberResponseDTO } from "../mapper/teamMemberResposeDTO";
import {
  CreateTeamMemberDTO,
  UpdateTeamMemberDTO,
  TeamMemberResponseDTO,
} from "../types/teamMember.types";
import { logger } from "../utils/logger";

export const TeamMemberService = {
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
    id: string
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
      .select(TEAM_MEMBER_SELECT)
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
