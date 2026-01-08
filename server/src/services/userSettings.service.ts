import { supabaseAdmin } from "../config/supabaseClient";
import {
  UserSettingsResponseDTO,
  UpdateUserSettingsDTO,
} from "../types/userSettings.types";
import { logger } from "../utils/logger";

function toUserSettingsDTO(row: any): UserSettingsResponseDTO {
  return {
    id: row.id,
    user_id: row.user_id,
    theme: row.theme,
    language: row.language,
    notifications_enabled: row.notifications_enabled,
    compact_mode: row.compact_mode,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const UserSettingsService = {
  async findOrCreate(userId: string): Promise<UserSettingsResponseDTO> {
    logger.info("UserSettingsService.findOrCreate", { userId });

    const { data, error } = await supabaseAdmin
      .from("user_settings")
      .select(
        "id, user_id, theme, language, notifications_enabled, compact_mode, created_at, updated_at"
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      logger.error("UserSettingsService.findOrCreate: select failed", {
        error,
      });
      throw error;
    }

    if (data) {
      return toUserSettingsDTO(data);
    }

    // Auto-create default settings
    const { data: created, error: createError } = await supabaseAdmin
      .from("user_settings")
      .insert({ user_id: userId })
      .select(
        "id, user_id, theme, language, notifications_enabled, compact_mode, created_at, updated_at"
      )
      .single();

    if (createError) {
      logger.error("UserSettingsService.findOrCreate: create failed", {
        createError,
      });
      throw createError;
    }

    return toUserSettingsDTO(created);
  },

  async update(
    userId: string,
    payload: UpdateUserSettingsDTO
  ): Promise<UserSettingsResponseDTO> {
    logger.info("UserSettingsService.update", { userId, payload });

    const { data, error } = await supabaseAdmin
      .from("user_settings")
      .update(payload)
      .eq("user_id", userId)
      .select(
        "id, user_id, theme, language, notifications_enabled, compact_mode, created_at, updated_at"
      )
      .single();

    if (error) {
      logger.error("UserSettingsService.update: update failed", { error });
      throw error;
    }

    return toUserSettingsDTO(data);
  },
};
