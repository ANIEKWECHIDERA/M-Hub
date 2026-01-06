import { supabaseAdmin } from "../config/supabaseClient";
import {
  CreateProjectDTO,
  UpdateProjectDTO,
  ProjectResponseDTO,
} from "../types/project.types";
import { logger } from "../utils/logger";
import { findOrCreateClient } from "../domain/client.domain";

function toProjectResponseDTO(row: any): ProjectResponseDTO {
  return {
    id: row.id,
    company_id: row.company_id,
    client_id: row.client_id,
    title: row.title,
    description: row.description,
    status: row.status,
    deadline: row.deadline,
    created_at: row.created_at,
  };
}

export const ProjectService = {
  async findAll(companyId: string): Promise<ProjectResponseDTO[]> {
    logger.info("ProjectService.findAll: start", { companyId });

    const { data, error } = await supabaseAdmin
      .from("projects")
      .select(
        "id, company_id, client_id, title, description, status, deadline, created_at"
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("ProjectService.findAll: supabase error", { error });
      throw error;
    }

    return data.map(toProjectResponseDTO);
  },

  async findById(
    id: string,
    companyId: string
  ): Promise<ProjectResponseDTO | null> {
    logger.info("ProjectService.findById: start", { id, companyId });

    const { data, error } = await supabaseAdmin
      .from("projects")
      .select(
        "id, company_id, client_id, title, description, status, deadline, created_at"
      )
      .eq("id", id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (error) {
      logger.error("ProjectService.findById: supabase error", { error });
      throw error;
    }

    return data ? toProjectResponseDTO(data) : null;
  },

  async create(payload: CreateProjectDTO): Promise<ProjectResponseDTO> {
    logger.info("ProjectService.create: start", {
      company_id: payload.company_id,
    });

    let clientId = payload.client_id ?? null;

    // If client object provided, find or create it
    if (!clientId && payload.client) {
      clientId = await findOrCreateClient(payload.company_id, payload.client);
    }

    const { client, ...projectData } = payload;

    const { data, error } = await supabaseAdmin
      .from("projects")
      .insert({
        ...projectData,
        client_id: clientId,
      })
      .select(
        "id, company_id, client_id, title, description, status, deadline, created_at"
      )
      .single();

    if (error) {
      logger.error("ProjectService.create: supabase error", { error });
      throw error;
    }
    logger.info("ProjectService.create: success", {
      projectId: data.id,
      clientId,
    });

    return toProjectResponseDTO(data);
  },

  async update(
    id: string,
    companyId: string,
    payload: UpdateProjectDTO
  ): Promise<ProjectResponseDTO | null> {
    logger.info("ProjectService.update: start", { id, companyId });

    const { data, error } = await supabaseAdmin
      .from("projects")
      .update(payload)
      .eq("id", id)
      .eq("company_id", companyId)
      .select(
        "id, company_id, client_id, title, description, status, deadline, created_at"
      )
      .maybeSingle();

    if (error) {
      logger.error("ProjectService.update: supabase error", { error });
      throw error;
    }

    return data ? toProjectResponseDTO(data) : null;
  },

  async deleteProjectById(id: string, companyId: string): Promise<void> {
    logger.info("ProjectService.deleteProjectById: start", { id, companyId });

    const { error } = await supabaseAdmin
      .from("projects")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) {
      logger.error("ProjectService.deleteProjectById: supabase error", {
        error,
      });
      throw error;
    }
  },
};
