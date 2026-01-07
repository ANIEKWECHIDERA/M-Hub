import { supabaseAdmin } from "../config/supabaseClient";
import { CreateProjectTeamMemberDTO } from "../types/projectTeamMember.types";
import { logger } from "../utils/logger";

export const ProjectTeamMemberService = {
  async findAll(companyId: string) {
    logger.info("PTM.findAll:start", { companyId });

    const { data, error } = await supabaseAdmin
      .from("project_team_members")
      .select("*")
      .eq("company_id", companyId)
      .order("joined_at", { ascending: false });

    if (error) {
      logger.error("PTM.findAll:error", { companyId, error });
      throw error;
    }

    return data ?? [];
  },

  async findById(id: string, companyId: string) {
    logger.info("PTM.findById:start", { id, companyId });

    const { data, error } = await supabaseAdmin
      .from("project_team_members")
      .select("*")
      .eq("id", id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (error) {
      logger.error("PTM.findById:error", { id, companyId, error });
      throw error;
    }

    return data;
  },

  async create(payload: CreateProjectTeamMemberDTO) {
    logger.info("PTM.create:start", {
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
      logger.error("PTM.create:error", { payload, error });
      throw error;
    }

    return data;
  },

  async deleteById(id: string, companyId: string) {
    logger.info("PTM.delete:start", { id, companyId });

    const { error } = await supabaseAdmin
      .from("project_team_members")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) {
      logger.error("PTM.delete:error", { id, companyId, error });
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
    logger.info("PTM.bulkAssign:start", {
      company_id,
      project_id,
      count: team_member_ids.length,
    });

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
      logger.error("PTM.bulkAssign:error", {
        company_id,
        project_id,
        error,
      });
      throw error;
    }

    return data;
  },
};
