import { supabaseAdmin } from "../config/supabaseClient";
import { logger } from "../utils/logger";

export const TaskService = {
  async findAll(companyId: string) {
    logger.info("TaskService.findAll: start", { companyId });

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("TaskService.findAll: supabase error", { error });
      throw error;
    }

    return data;
  },

  async findById(id: string, companyId: string) {
    logger.info("TaskService.findById: start", { id, companyId });

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("id", id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (error) {
      logger.error("TaskService.findById: supabase error", { error });
      throw error;
    }

    return data;
  },

  async create(taskData: any) {
    logger.info("TaskService.create: start", {
      company_id: taskData.company_id,
    });

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .insert(taskData)
      .select()
      .single();

    if (error) {
      logger.error("TaskService.create: supabase error", { error });
      throw error;
    }

    return data;
  },

  async update(id: string, companyId: string, taskData: any) {
    logger.info("TaskService.update: start", { id, companyId });

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .update(taskData)
      .eq("id", id)
      .eq("company_id", companyId)
      .select()
      .maybeSingle();

    if (error) {
      logger.error("TaskService.update: supabase error", { error });
      throw error;
    }

    return data;
  },

  async deleteById(id: string, companyId: string) {
    logger.info("TaskService.deleteById: start", { id, companyId });

    const { error } = await supabaseAdmin
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) {
      logger.error("TaskService.deleteById: supabase error", { error });
      throw error;
    }

    return true;
  },
};
