import { supabaseAdmin } from "../config/supabaseClient";
import {
  CreateProjectDTO,
  UpdateProjectDTO,
  ProjectResponseDTO,
  UpdateProjectInput,
} from "../types/project.types";
import { logger } from "../utils/logger";
import { findOrCreateClient } from "../domain/client.domain";
import { PROJECT_SELECT } from "../dbSelect/project.select";
import { toProjectResponseDTO } from "../mapper/projectResponse.DTO";

export const ProjectService = {
  async findAll(companyId: string): Promise<ProjectResponseDTO[]> {
    logger.info("ProjectService.findAll: start", { companyId });

    const { data, error } = await supabaseAdmin
      .from("projects")
      .select(PROJECT_SELECT)
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
      .select(PROJECT_SELECT)
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

    const { team_member_ids, client, ...projectPayload } = payload;

    // 1️⃣ Resolve client
    let clientId = projectPayload.client_id ?? null;

    if (!clientId && client) {
      clientId = await findOrCreateClient(payload.company_id, client);
    }

    // 2️⃣ Create project (projects table ONLY)
    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .insert({
        ...projectPayload,
        client_id: clientId,
      })
      .select("id")
      .single();

    if (error) {
      logger.error("ProjectService.create: project insert error", { error });
      throw error;
    }

    // 3️⃣ Insert team members (junction table)
    if (team_member_ids && team_member_ids.length > 0) {
      const rows = team_member_ids.map((teamMemberId) => ({
        project_id: project.id,
        team_member_id: teamMemberId,
        company_id: payload.company_id,
      }));

      const { error: membersError } = await supabaseAdmin
        .from("project_team_members")
        .insert(rows);

      if (membersError) {
        logger.error("ProjectService.create: insert team members error", {
          membersError,
        });
        throw membersError;
      }
    }

    // 4️⃣ Return enriched project
    const enriched = await this.findById(project.id, payload.company_id);

    if (!enriched) {
      throw new Error("Failed to retrieve created project");
    }

    logger.info("ProjectService.create: success", {
      projectId: project.id,
      clientId,
    });

    return enriched;
  },
  async update(
    id: string,
    companyId: string,
    payload: UpdateProjectInput
  ): Promise<ProjectResponseDTO | null> {
    logger.info("ProjectService.update: start", { id, companyId });

    const { team_member_ids, ...projectData } = payload;

    // Update project table (ONLY scalar fields)
    if (Object.keys(projectData).length > 0) {
      const { error } = await supabaseAdmin
        .from("projects")
        .update(projectData)
        .eq("id", id)
        .eq("company_id", companyId);

      if (error) {
        logger.error("ProjectService.update: project update error", { error });
        throw error;
      }
    }

    // Update team members (junction table)
    if (team_member_ids) {
      // Remove existing members
      const { error: deleteError } = await supabaseAdmin
        .from("project_team_members")
        .delete()
        .eq("project_id", id)
        .eq("company_id", companyId);

      if (deleteError) {
        logger.error("ProjectService.update: delete team members error", {
          deleteError,
        });
        throw deleteError;
      }

      // Insert new members
      if (team_member_ids.length > 0) {
        const rows = team_member_ids.map((teamMemberId) => ({
          project_id: id,
          team_member_id: teamMemberId,
          company_id: companyId,
        }));

        const { error: insertError } = await supabaseAdmin
          .from("project_team_members")
          .insert(rows);

        if (insertError) {
          logger.error("ProjectService.update: insert team members error", {
            insertError,
          });
          throw insertError;
        }
      }
    }

    // Return enriched project
    return this.findById(id, companyId);
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
