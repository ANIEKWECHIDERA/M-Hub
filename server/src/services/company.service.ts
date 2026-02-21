// src/services/company.service.ts
import { log } from "console";
import { supabaseAdmin } from "../config/supabaseClient";
import {
  CompanyResponseDTO,
  CreateCompanyDTO,
  UpdateCompanyDTO,
} from "../types/company.types";
import { logger } from "../utils/logger";
import { AppUser } from "../types/types";

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

  async create(
    user: AppUser,
    payload: CreateCompanyDTO,
  ): Promise<CompanyResponseDTO> {
    logger.info("CompanyService.create: start", {
      userId: user.id,
      companyId: user.company_id,
    });

    const userId = user.id;

    // 🚀 If user already has company → return existing
    if (user.company_id) {
      logger.info("User already has company, returning existing", {
        companyId: user.company_id,
      });

      const { data: company, error } = await supabaseAdmin
        .from("companies")
        .select("id, name, description, created_at")
        .eq("id", user.company_id)
        .maybeSingle();

      if (error || !company) {
        logger.error("Failed to fetch existing company", { error });
        throw new Error("Failed to fetch existing company");
      }

      return toCompanyResponseDTO(company);
    }

    // 🚀 Create company
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: payload.name,
        description: payload.description ?? null,
        logo_url: payload.logoUrl ?? null,
      })
      .select("id, name, description, created_at")
      .single();

    if (companyError || !company) {
      logger.error("Company creation failed", { companyError });
      throw new Error("Failed to create company");
    }

    // 🚀 Create team member (owner)
    const { error: teamError } = await supabaseAdmin
      .from("team_members")
      .insert({
        user_id: userId,
        company_id: company.id,
        email: user.email,
        role: "owner",
        access: "superAdmin",
        status: "active",
      });

    if (teamError) {
      logger.error("Team member creation failed", { teamError });
      throw new Error("Failed to assign owner role");
    }

    // 🚀 Update user
    const { error: userUpdateError } = await supabaseAdmin
      .from("users")
      .update({ has_company: true })
      .eq("id", userId);

    if (userUpdateError) {
      logger.error("User update failed", { userUpdateError });
      throw new Error("Failed to finalize company setup");
    }

    logger.info("Company created successfully", { companyId: company.id });

    return toCompanyResponseDTO(company);
  },
  async update(
    companyId: string,
    payload: UpdateCompanyDTO,
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
