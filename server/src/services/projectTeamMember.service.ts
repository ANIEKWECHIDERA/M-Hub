import { supabaseAdmin } from "../config/supabaseClient";
import {
  CreateProjectTeamMemberDTO,
  UpdateProjectTeamMemberDTO,
} from "../types/projectTeamMember.types";
import { logger } from "../utils/logger";

export const ProjectTeamMemberService = {
  async findAll(companyId: string) {
    logger.info("PTM.findAll: start", { companyId });

    const { data, error } = await supabaseAdmin
      .from("project_team_members")
      .select("*")
      .eq("company_id", companyId)
      .order("joined_at", { ascending: false });

    if (error) {
      logger.error("PTM.findAll: supabase error", { companyId, error });
      throw error;
    }

    return data ?? [];
  },

  async findById(id: string, companyId: string) {
    logger.info("PTM.findById: start", { id, companyId });

    const { data, error } = await supabaseAdmin
      .from("project_team_members")
      .select("*")
      .eq("id", id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (error) {
      logger.error("PTM.findById: supabase error", { id, companyId, error });
      throw error;
    }

    return data;
  },

  async create(payload: CreateProjectTeamMemberDTO) {
    logger.info("PTM.create: inserting", {
      company_id: payload.company_id,
      project_id: payload.project_id,
      team_member_id: payload.team_member_id,
    });

    const { data, error } = await supabaseAdmin
      .from("project_team_members")
      .insert(payload)
      .select()
      .single();

    if (error) {
      logger.error("PTM.create: supabase error", { payload, error });
      throw error;
    }

    return data;
  },

  async update(
    id: string,
    companyId: string,
    payload: UpdateProjectTeamMemberDTO
  ) {
    logger.info("PTM.update: start", { id, companyId, payload });

    const { data, error } = await supabaseAdmin
      .from("project_team_members")
      .update(payload)
      .eq("id", id)
      .eq("company_id", companyId)
      .select()
      .maybeSingle();

    if (error) {
      logger.error("PTM.update: supabase error", {
        id,
        companyId,
        payload,
        error,
      });
      throw error;
    }

    return data;
  },

  async deleteById(id: string, companyId: string) {
    logger.info("PTM.deleteById: start", { id, companyId });

    const { error } = await supabaseAdmin
      .from("project_team_members")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) {
      logger.error("PTM.deleteById: supabase error", {
        id,
        companyId,
        error,
      });
      throw error;
    }
  },

  async bulkAssign({
    company_id,
    project_id,
    team_member_ids,
    role,
  }: {
    company_id: string;
    project_id: string;
    team_member_ids: string[];
    role?: string;
  }) {
    logger.info("PTM.bulkAssign: preparing records", {
      company_id,
      project_id,
      count: team_member_ids.length,
    });

    // Build rows
    const rows = team_member_ids.map((team_member_id) => ({
      company_id,
      project_id,
      team_member_id,
      role,
    }));

    const { data, error } = await supabaseAdmin
      .from("project_team_members")
      .insert(rows)
      .select();

    if (error) {
      logger.error("PTM.bulkAssign: supabase error", {
        company_id,
        project_id,
        error,
      });
      throw error;
    }

    return data;
  },
};
