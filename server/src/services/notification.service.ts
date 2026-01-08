import { supabaseAdmin } from "../config/supabaseClient";
import { logger } from "../utils/logger";
import {
  CreateNotificationDTO,
  NotificationResponseDTO,
} from "../types/notification.types";

function toNotificationDTO(row: any): NotificationResponseDTO {
  return {
    id: row.id,
    user_id: row.user_id,
    company_id: row.company_id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.read,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const NotificationService = {
  async findByUser(
    companyId: string,
    userId: string
  ): Promise<NotificationResponseDTO[]> {
    logger.info("NotificationService.findByUser", {
      companyId,
      userId,
    });

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select(
        "id, user_id, company_id, type, title, message, read, created_at, updated_at"
      )
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("NotificationService.findByUser: error", { error });
      throw error;
    }

    return data.map(toNotificationDTO);
  },

  async markAsRead(
    id: string,
    companyId: string,
    userId: string
  ): Promise<NotificationResponseDTO | null> {
    logger.info("NotificationService.markAsRead", {
      id,
      companyId,
      userId,
    });

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .select(
        "id, user_id, company_id, type, title, message, read, created_at, updated_at"
      )
      .maybeSingle();

    if (error) {
      logger.error("NotificationService.markAsRead: error", { error });
      throw error;
    }

    return data ? toNotificationDTO(data) : null;
  },

  async create(payload: CreateNotificationDTO): Promise<void> {
    logger.info("NotificationService.create", payload);

    const { error } = await supabaseAdmin.from("notifications").insert(payload);

    if (error) {
      logger.error("NotificationService.create: error", { error });
      throw error;
    }
  },
};
