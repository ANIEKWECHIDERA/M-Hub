// src/services/company.service.ts
import { supabaseAdmin } from "../config/supabaseClient";
import {
  CompanyResponseDTO,
  CreateCompanyDTO,
  UpdateCompanyDTO,
} from "../types/company.types";
import { logger } from "../utils/logger";

function toCompanyResponseDTO(row: any): CompanyResponseDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    created_at: row.created_at,
  };
}

export const CompanyService = {
  async findById(companyId: string): Promise<CompanyResponseDTO | null> {
    logger.info("CompanyService.findById: start", { companyId });

    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("id, name, description, created_at")
      .eq("id", companyId)
      .maybeSingle();

    if (error) {
      logger.error("CompanyService.findById: supabase error", { error });
      throw error;
    }

    return data ? toCompanyResponseDTO(data) : null;
  },

  async create(payload: CreateCompanyDTO): Promise<CompanyResponseDTO> {
    logger.info("CompanyService.create: start", { payload });

    const { data, error } = await supabaseAdmin
      .from("companies")
      .insert(payload)
      .select("id, name, description, created_at")
      .single();

    if (error) {
      logger.error("CompanyService.create: supabase error", { error });
      throw error;
    }

    return toCompanyResponseDTO(data);
  },

  async update(
    companyId: string,
    payload: UpdateCompanyDTO
  ): Promise<CompanyResponseDTO | null> {
    logger.info("CompanyService.update: start", { companyId });

    const { data, error } = await supabaseAdmin
      .from("companies")
      .update(payload)
      .eq("id", companyId)
      .select("id, name, description, created_at")
      .maybeSingle();

    if (error) {
      logger.error("CompanyService.update: supabase error", { error });
      throw error;
    }

    return data ? toCompanyResponseDTO(data) : null;
  },

  async deleteById(companyId: string): Promise<void> {
    logger.info("CompanyService.deleteById: start", { companyId });

    const { error } = await supabaseAdmin
      .from("companies")
      .delete()
      .eq("id", companyId);

    if (error) {
      logger.error("CompanyService.deleteById: supabase error", { error });
      throw error;
    }

    logger.info("CompanyService.deleteById: success", { companyId });
  },
};
