import { supabaseAdmin } from "../config/supabaseClient";
import { CreateProjectDTO, UpdateProjectDTO } from "../types/types";
import { logger } from "../utils/logger";

export const ProjectService = {
  async findAll(companyId: string) {
    logger.info("ProjectService.findAll: start", { companyId });

    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("ProjectService.findAll: supabase error", {
        companyId,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
      });
      throw error;
    }

    logger.info("ProjectService.findAll: success", {
      companyId,
      count: data?.length ?? 0,
    });

    return data;
  },

  async findById(id: string, companyId: string) {
    logger.info("ProjectService.findById: start", { id, companyId });

    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("company_id", companyId)
      .single();

    if (error) {
      logger.error("ProjectService.findById: supabase error", {
        id,
        companyId,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
      });
      throw error;
    }

    logger.info("ProjectService.findById: success", { id, companyId });

    return data;
  },

  async create(projectData: CreateProjectDTO) {
    logger.info("ProjectService.create: start", {
      company_id: projectData.company_id,
      payloadKeys: Object.keys(projectData),
    });

    const { data, error } = await supabaseAdmin
      .from("projects")
      .insert(projectData)
      .select()
      .single();

    if (error) {
      logger.error("ProjectService.create: supabase error", {
        company_id: projectData.company_id,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
      });
      throw error;
    }

    logger.info("ProjectService.create: success", {
      projectId: data?.id,
      company_id: data?.company_id,
    });

    return data;
  },

  async update(id: string, companyId: string, projectData: UpdateProjectDTO) {
    logger.info("ProjectService.update: start", {
      id,
      companyId,
      payloadKeys: Object.keys(projectData),
    });

    const { data, error } = await supabaseAdmin
      .from("projects")
      .update(projectData)
      .eq("id", id)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error) {
      logger.error("ProjectService.update: supabase error", {
        id,
        companyId,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
      });
      throw error;
    }

    logger.info("ProjectService.update: success", { id, companyId });

    return data;
  },

  async deleteProjectById(id: string, companyId: string) {
    logger.info("ProjectService.deleteProjectById: start", { id, companyId });

    const { error } = await supabaseAdmin
      .from("projects")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) {
      logger.error("ProjectService.deleteProjectById: supabase error", {
        id,
        companyId,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
      });
      throw error;
    }

    logger.info("ProjectService.deleteProjectById: success", { id, companyId });

    return true;
  },
};
