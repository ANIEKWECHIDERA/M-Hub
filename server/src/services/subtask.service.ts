import { supabaseAdmin } from "../config/supabaseClient";
import { logger } from "../utils/logger";

export const SubtaskService = {
  async findAll(companyId: string, teamMemberId: string, taskId?: string) {
    logger.info("SubtaskService.findAll: start", {
      companyId,
      teamMemberId,
      taskId,
    });

    let query = supabaseAdmin
      .from("subtasks")
      .select("*")
      .eq("company_id", companyId)
      .eq("team_member_id", teamMemberId)
      .order("created_at", { ascending: false });

    if (taskId) {
      query = query.eq("task_id", taskId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("SubtaskService.findAll: supabase error", { error });
      throw error;
    }

    return data;
  },

  async findById(id: string, companyId: string, teamMemberId: string) {
    logger.info("SubtaskService.findById: start", {
      id,
      companyId,
      teamMemberId,
    });

    const { data, error } = await supabaseAdmin
      .from("subtasks")
      .select("*")
      .eq("id", id)
      .eq("company_id", companyId)
      .eq("team_member_id", teamMemberId)
      .maybeSingle();

    if (error) {
      logger.error("SubtaskService.findById: supabase error", { error });
      throw error;
    }

    return data;
  },

  async create(subtaskData: any) {
    logger.info("SubtaskService.create: start", {
      company_id: subtaskData.company_id,
      task_id: subtaskData.task_id,
    });

    const { data, error } = await supabaseAdmin
      .from("subtasks")
      .insert(subtaskData)
      .select()
      .single();

    if (error) {
      logger.error("SubtaskService.create: supabase error", { error });
      throw error;
    }

    return data;
  },

  async update(
    id: string,
    companyId: string,
    teamMemberId: string,
    subtaskData: any,
  ) {
    logger.info("SubtaskService.update: start", {
      id,
      companyId,
      teamMemberId,
    });

    const { data, error } = await supabaseAdmin
      .from("subtasks")
      .update(subtaskData)
      .eq("id", id)
      .eq("company_id", companyId)
      .eq("team_member_id", teamMemberId)
      .select()
      .maybeSingle();

    if (error) {
      logger.error("SubtaskService.update: supabase error", { error });
      throw error;
    }

    return data;
  },

  async deleteById(id: string, companyId: string, teamMemberId: string) {
    logger.info("SubtaskService.deleteById: start", {
      id,
      companyId,
      teamMemberId,
    });

    const { error } = await supabaseAdmin
      .from("subtasks")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId)
      .eq("team_member_id", teamMemberId);

    if (error) {
      logger.error("SubtaskService.deleteById: supabase error", { error });
      throw error;
    }

    return true;
  },
};
