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

  async create(
    payload: CreateCompanyDTO,
    user: { user_id: string; email: string },
  ): Promise<CompanyResponseDTO> {
    logger.info("CompanyService.create: start", { payload, user });

    // 1️⃣ Create company
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: payload.name,
        description: payload.description || null,
      })
      .select("id, name, description, created_at")
      .single();

    if (companyError) {
      logger.error("CompanyService.create: company insert error", {
        companyError,
      });
      throw companyError;
    }

    // 2️⃣ Check if team member exists
    const { data: existingMember } = await supabaseAdmin
      .from("team_members")
      .select("id")
      .eq("user_id", user.user_id)
      .maybeSingle();

    if (existingMember) {
      // Set has_company true anyway
      await supabaseAdmin
        .from("users")
        .update({ has_company: true })
        .eq("id", user.user_id);

      throw new Error("User already exists");
    }

    // 3️⃣ Insert team member
    const { error: memberError } = await supabaseAdmin
      .from("team_members")
      .insert({
        user_id: user.user_id,
        company_id: company.id,
        email: user.email,
        role: "Owner",
        access: "superAdmin",
        status: "active",
      });

    if (memberError) {
      logger.error("CompanyService.create: team member insert error", {
        memberError,
      });
      throw memberError;
    }

    // 4️⃣ LAST STEP → update has_company
    await supabaseAdmin
      .from("users")
      .update({ has_company: true })
      .eq("id", user.user_id);

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
