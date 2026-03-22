import { supabaseAdmin } from "../config/supabaseClient";
import { prisma } from "../lib/prisma";
import {
  CompanyResponseDTO,
  CreateCompanyDTO,
  UpdateCompanyDTO,
} from "../types/company.types";
import { logger } from "../utils/logger";
import { AppUser } from "../types/types";
import { RequestCacheService } from "./requestCache.service";
import { ChatService } from "./chat.service";

function toCompanyResponseDTO(row: any): CompanyResponseDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    logo_url: row.logo_url ?? null,
    created_at: row.created_at,
  };
}

async function findOwnedWorkspace(tx: any, userId: string) {
  const ownedWorkspaces = await tx.$queryRaw<Array<Record<string, any>>>`
    SELECT c.id, c.name, c.description, c.logo_url, c.created_at
    FROM team_members tm
    INNER JOIN companies c ON c.id = tm.company_id
    WHERE tm.user_id = ${userId}::uuid
      AND tm.access = ${"superAdmin"}
      AND tm.role = ${"owner"}
      AND tm.status = ${"active"}
    ORDER BY tm.created_at ASC
    LIMIT 1
    FOR UPDATE`;

  return ownedWorkspaces[0] ?? null;
}

export const CompanyService = {
  async findById(companyId: string): Promise<CompanyResponseDTO | null> {
    logger.info("CompanyService.findById: start", { companyId });

    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("id, name, description, logo_url, created_at")
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
    const companyName = payload.name.trim();
    const description = payload.description?.trim() || null;

    if (!companyName) {
      throw new Error("Company name is required");
    }

    const company = await prisma.$transaction(async (tx) => {
      // Lock the user row so retries and double submits resolve to a single
      // company setup flow.
      const lockedUsers = await tx.$queryRaw<Array<Record<string, any>>>`
        SELECT id, company_id, has_company
        FROM users
        WHERE id = ${userId}::uuid
        FOR UPDATE`;

      const lockedUser = lockedUsers[0];

      if (!lockedUser) {
        throw new Error("User not found");
      }

      const memberships = await tx.$queryRaw<Array<Record<string, any>>>`
        SELECT company_id
        FROM team_members
        WHERE user_id = ${userId}::uuid
        LIMIT 1`;

      const existingCompanyId =
        lockedUser.company_id ?? memberships[0]?.company_id ?? null;

      if (existingCompanyId) {
        logger.info("CompanyService.create: returning existing company", {
          companyId: existingCompanyId,
          userId,
        });

        await tx.$executeRaw`
          UPDATE users
          SET company_id = ${existingCompanyId}::uuid,
              has_company = ${true},
              updated_at = NOW()
          WHERE id = ${userId}::uuid`;

        const existingCompanies = await tx.$queryRaw<Array<Record<string, any>>>`
          SELECT id, name, description, logo_url, created_at
          FROM companies
          WHERE id = ${existingCompanyId}::uuid
          LIMIT 1`;

        return existingCompanies[0];
      }

      const insertedCompanies = await tx.$queryRaw<Array<Record<string, any>>>`
        INSERT INTO companies (name, description, logo_url)
        VALUES (${companyName}, ${description}, ${payload.logoUrl ?? null})
        RETURNING id, name, description, logo_url, created_at`;

      const createdCompany = insertedCompanies[0];

      await tx.$executeRaw`
        INSERT INTO team_members (user_id, company_id, email, role, access, status)
        VALUES (
          ${userId}::uuid,
          ${createdCompany.id}::uuid,
          ${user.email},
          ${"owner"},
          ${"superAdmin"},
          ${"active"}
        )`;

      await tx.$executeRaw`
        UPDATE users
        SET company_id = ${createdCompany.id}::uuid,
            has_company = ${true},
            updated_at = NOW()
        WHERE id = ${userId}::uuid`;

      return createdCompany;
    });

    logger.info("Company created successfully", { companyId: company.id });
    RequestCacheService.invalidateUserContext({
      userId,
      firebaseUid: user.firebase_uid,
    });
    await ChatService.ensureGeneralConversation(company.id);

    return toCompanyResponseDTO(company);
  },

  async ensurePersonalWorkspace(user: {
    id: string;
    email: string;
    firebase_uid: string;
  }) {
    logger.info("CompanyService.ensurePersonalWorkspace:start", {
      userId: user.id,
      email: user.email,
    });

    const company = await prisma.$transaction(async (tx) => {
      const lockedUsers = await tx.$queryRaw<Array<Record<string, any>>>`
        SELECT id, company_id, has_company
        FROM users
        WHERE id = ${user.id}::uuid
        FOR UPDATE`;

      const lockedUser = lockedUsers[0];

      if (!lockedUser) {
        throw new Error("User not found");
      }

      const existingOwnedWorkspace = await findOwnedWorkspace(tx, user.id);

      if (existingOwnedWorkspace) {
        await tx.$executeRaw`
          UPDATE users
          SET has_company = ${true},
              company_id = COALESCE(company_id, ${existingOwnedWorkspace.id}::uuid),
              updated_at = NOW()
          WHERE id = ${user.id}::uuid`;

        return {
          company: existingOwnedWorkspace,
          created: false,
        };
      }

      const insertedCompanies = await tx.$queryRaw<Array<Record<string, any>>>`
        INSERT INTO companies (name, description, logo_url)
        VALUES (${"My Workspace"}, ${null}, ${null})
        RETURNING id, name, description, logo_url, created_at`;

      const personalWorkspace = insertedCompanies[0];

      await tx.$executeRaw`
        INSERT INTO team_members (user_id, company_id, email, role, access, status)
        VALUES (
          ${user.id}::uuid,
          ${personalWorkspace.id}::uuid,
          ${user.email},
          ${"owner"},
          ${"superAdmin"},
          ${"active"}
        )`;

      await tx.$executeRaw`
        UPDATE users
        SET has_company = ${true},
            company_id = COALESCE(company_id, ${personalWorkspace.id}::uuid),
            updated_at = NOW()
        WHERE id = ${user.id}::uuid`;

      return {
        company: personalWorkspace,
        created: true,
      };
    });

    RequestCacheService.invalidateUserContext({
      userId: user.id,
      firebaseUid: user.firebase_uid,
    });
    await ChatService.ensureGeneralConversation(company.company.id);

    logger.info("CompanyService.ensurePersonalWorkspace:success", {
      userId: user.id,
      companyId: company.company.id,
      created: company.created,
    });

    return {
      company: toCompanyResponseDTO(company.company),
      created: company.created,
    };
  },

  async update(
    companyId: string,
    payload: UpdateCompanyDTO,
  ): Promise<CompanyResponseDTO | null> {
    logger.info("CompanyService.update: start", { companyId });

    const updatePayload = {
      ...(payload.name ? { name: payload.name.trim() } : {}),
      ...(payload.description !== undefined
        ? { description: payload.description?.trim() || null }
        : {}),
      ...(payload.logoUrl !== undefined ? { logo_url: payload.logoUrl } : {}),
    };

    const { data, error } = await supabaseAdmin
      .from("companies")
      .update(updatePayload)
      .eq("id", companyId)
      .select("id, name, description, logo_url, created_at")
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
