import { apiFetch } from "./http";

export type UserSettingsRecord = {
  id: string;
  user_id: string;
  theme: "light" | "dark";
  language: string;
  notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  task_assignment_notifications: boolean;
  project_update_notifications: boolean;
  comment_notifications: boolean;
  daily_focus_email_enabled: boolean;
  compact_mode: boolean;
  created_at: string;
  updated_at: string;
};

export type UpdateUserSettingsInput = Partial<
  Pick<
    UserSettingsRecord,
    | "theme"
    | "language"
    | "notifications_enabled"
    | "email_notifications_enabled"
    | "task_assignment_notifications"
    | "project_update_notifications"
    | "comment_notifications"
    | "daily_focus_email_enabled"
    | "compact_mode"
  >
>;

export const userSettingsAPI = {
  get(idToken: string) {
    return apiFetch<UserSettingsRecord>("/api/user/settings", undefined, idToken);
  },

  update(payload: UpdateUserSettingsInput, idToken: string) {
    return apiFetch<UserSettingsRecord>(
      "/api/user/settings",
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      idToken,
    );
  },
};
