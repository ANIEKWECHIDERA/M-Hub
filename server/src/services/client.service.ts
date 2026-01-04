import { supabaseAdmin } from "../config/supabaseClient";
import {
  ClientResponseDTO,
  CreateClientDTO,
  UpdateClientDTO,
} from "../types/client.types";
import { logger } from "../utils/logger";

function toClientResponseDTO(row: any): ClientResponseDTO {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    created_at: row.created_at,
  };
}

export const ClientService = {
  async findAll(companyId: string): Promise<ClientResponseDTO[]> {
    logger.info("ClientService.findAll: start", { companyId });

    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("id, name, email, phone, address, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("ClientService.findAll: supabase error", { error });
      throw error;
    }

    return data.map(toClientResponseDTO);
  },

  async findById(
    companyId: string,
    clientId: string
  ): Promise<ClientResponseDTO | null> {
    logger.info("ClientService.findById: start", { companyId, clientId });

    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("id, name, email, phone, address, created_at")
      .eq("company_id", companyId)
      .eq("id", clientId)
      .maybeSingle();

    if (error) {
      logger.error("ClientService.findById: supabase error", { error });
      throw error;
    }

    return data ? toClientResponseDTO(data) : null;
  },

  async create(
    companyId: string,
    payload: CreateClientDTO
  ): Promise<ClientResponseDTO> {
    logger.info("ClientService.create: start", { companyId, payload });

    const { data, error } = await supabaseAdmin
      .from("clients")
      .insert({
        ...payload,
        company_id: companyId,
      })
      .select("id, name, email, phone, address, created_at")
      .single();

    if (error) {
      logger.error("ClientService.create: supabase error", { error });
      throw error;
    }

    return toClientResponseDTO(data);
  },

  async update(
    companyId: string,
    clientId: string,
    payload: UpdateClientDTO
  ): Promise<ClientResponseDTO | null> {
    logger.info("ClientService.update: start", { companyId, clientId });

    const { data, error } = await supabaseAdmin
      .from("clients")
      .update(payload)
      .eq("company_id", companyId)
      .eq("id", clientId)
      .select("id, name, email, phone, address, created_at")
      .maybeSingle();

    if (error) {
      logger.error("ClientService.update: supabase error", { error });
      throw error;
    }

    return data ? toClientResponseDTO(data) : null;
  },

  async deleteById(companyId: string, clientId: string): Promise<void> {
    logger.info("ClientService.deleteById: start", { companyId, clientId });

    const { error } = await supabaseAdmin
      .from("clients")
      .delete()
      .eq("company_id", companyId)
      .eq("id", clientId);

    if (error) {
      logger.error("ClientService.deleteById: supabase error", { error });
      throw error;
    }

    logger.info("ClientService.deleteById: success", { clientId });
  },
};
