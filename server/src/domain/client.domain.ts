import { supabaseAdmin } from "../config/supabaseClient";
import { logger } from "../utils/logger";

export interface CreateClientInput {
  company_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export async function findOrCreateClient(
  companyId: string,
  client: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  }
): Promise<string> {
  // 1. Try to find existing client
  const { data: existingClient, error: findError } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", client.name)
    .maybeSingle();

  if (findError) {
    logger.error("findOrCreateClient: lookup failed", { findError });
    throw findError;
  }

  if (existingClient) {
    logger.info("findOrCreateClient: existing client found", {
      clientId: existingClient.id,
    });
    return existingClient.id;
  }

  // 2. Create client if not found
  const { data: newClient, error: createError } = await supabaseAdmin
    .from("clients")
    .insert({
      company_id: companyId,
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
    })
    .select("id")
    .single();

  if (createError) {
    logger.error("findOrCreateClient: creation failed", { createError });
    throw createError;
  }

  logger.info("findOrCreateClient: client created", {
    clientId: newClient.id,
  });

  return newClient.id;
}
