import { supabaseAdmin } from "../config/supabaseClient";
import { CreateTaskAssigneeDTO } from "../types/taskAssignee.types";
import { logger } from "../utils/logger";

export const TaskAssigneeService = {
  async findAll(companyId: string) {
    logger.info("TaskAssigneeService.findAll", { companyId });

    const { data, error } = await supabaseAdmin
      .from("task_team_member_assignees")
      .select("*")
      .eq("company_id", companyId);

    if (error) {
      logger.error("TaskAssigneeService.findAll:error", {
        companyId,
        error,
      });
      throw error;
    }

    return data ?? [];
  },

  async findById(id: string, companyId: string) {
    logger.info("TaskAssigneeService.findById", { id, companyId });

    const { data, error } = await supabaseAdmin
      .from("task_team_member_assignees")
      .select("*")
      .eq("id", id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (error) {
      logger.error("TaskAssigneeService.findById:error", {
        id,
        companyId,
        error,
      });
      throw error;
    }

    return data;
  },

  async create(payload: CreateTaskAssigneeDTO) {
    logger.info("TaskAssigneeService.create", {
      company_id: payload.company_id,
      task_id: payload.task_id,
      team_member_id: payload.team_member_id,
    });

    const { data, error } = await supabaseAdmin
      .from("task_team_member_assignees")
      .insert(payload)
      .select()
      .single();

    if (error) {
      logger.error("TaskAssigneeService.create:error", {
        payload,
        error,
      });
      throw error;
    }

    return data;
  },

  async bulkAssign({
    company_id,
    project_id,
    task_id,
    team_member_ids,
  }: {
    company_id: string;
    project_id: string;
    task_id: string;
    team_member_ids: string[];
  }) {
    logger.info("TaskAssigneeService.bulkAssign", {
      company_id,
      project_id,
      task_id,
      count: team_member_ids.length,
    });

    const rows = team_member_ids.map((team_member_id) => ({
      company_id,
      project_id,
      task_id,
      team_member_id,
    }));

    const { data, error } = await supabaseAdmin
      .from("task_team_member_assignees")
      .insert(rows)
      .select();

    if (error) {
      logger.error("TaskAssigneeService.bulkAssign:error", {
        company_id,
        project_id,
        task_id,
        error,
      });
      throw error;
    }

    return data;
  },

  async deleteById(id: string, companyId: string) {
    logger.info("TaskAssigneeService.deleteById", { id, companyId });

    const { error } = await supabaseAdmin
      .from("task_team_member_assignees")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) {
      logger.error("TaskAssigneeService.deleteById:error", {
        id,
        companyId,
        error,
      });
      throw error;
    }
  },
};
