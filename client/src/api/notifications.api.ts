import { apiFetch } from "./http";

export interface NotificationRecord {
  id: string;
  user_id: string;
  company_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationListResponse {
  notifications: NotificationRecord[];
  unreadCount: number;
}

export const notificationsAPI = {
  list(idToken: string, limit = 50) {
    return apiFetch<NotificationListResponse>(
      `/api/notifications?limit=${limit}`,
      undefined,
      idToken,
    );
  },

  getUnreadCount(idToken: string) {
    return apiFetch<{ unreadCount: number }>(
      "/api/notifications/unread-count",
      undefined,
      idToken,
    );
  },

  markAsRead(id: string, idToken: string) {
    return apiFetch<{
      notification: NotificationRecord;
      unreadCount: number;
    }>(`/api/notifications/${id}/read`, { method: "PATCH" }, idToken);
  },

  markAllAsRead(idToken: string) {
    return apiFetch<{ unreadCount: number }>(
      "/api/notifications/read-all",
      { method: "PATCH" },
      idToken,
    );
  },

  clearOne(id: string, idToken: string) {
    return apiFetch<{ success: boolean; unreadCount: number }>(
      `/api/notifications/${id}`,
      { method: "DELETE" },
      idToken,
    );
  },

  clearAll(idToken: string) {
    return apiFetch<{ success: boolean; unreadCount: number; clearedCount: number }>(
      "/api/notifications",
      { method: "DELETE" },
      idToken,
    );
  },
};
