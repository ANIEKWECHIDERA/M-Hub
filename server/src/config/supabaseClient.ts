import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { logger } from "../utils/logger";

dotenv.config();

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
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
