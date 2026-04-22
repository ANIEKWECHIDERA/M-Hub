import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { logger } from "../utils/logger";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const configuredSupabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

function getJwtRole(token?: string) {
  if (!token) {
    return "missing";
  }

  const [, payload] = token.split(".");
  if (!payload) {
    return "not-jwt";
  }

  try {
    const normalizedPayload = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const decoded = JSON.parse(
      Buffer.from(normalizedPayload, "base64").toString("utf8")
    );

    return typeof decoded.role === "string" ? decoded.role : "unknown";
  } catch {
    return "unreadable";
  }
}

if (!supabaseUrl || !configuredSupabaseServiceRoleKey) {
  throw new Error(
    "Missing Supabase server configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
}

export const supabaseServiceRoleKey = configuredSupabaseServiceRoleKey;

const supabaseKeyRole = getJwtRole(supabaseServiceRoleKey);
if (supabaseKeyRole !== "service_role") {
  logger.warn(
    "Supabase backend key is not service_role. Backend-only RLS migrations require SUPABASE_SERVICE_ROLE_KEY."
  );
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey
);

// Example helper for logging queries
export const fetchUsers = async () => {
  const { data, error } = await supabaseAdmin.from("users").select("*");
  if (error) {
    logger.error(`[SUPABASE ERROR] ${error.message}`);
    throw error;
  } else {
    logger.info(`[SUPABASE] Fetched ${data.length} users`);
    return data;
  }
};
