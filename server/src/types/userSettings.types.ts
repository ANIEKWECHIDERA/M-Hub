export interface UserSettingsResponseDTO {
  id: string;
  user_id: string;
  theme: string;
  language: string;
  notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  task_assignment_notifications: boolean;
  project_update_notifications: boolean;
  comment_notifications: boolean;
  compact_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateUserSettingsDTO {
  theme?: "light" | "dark";
  language?: string;
  notifications_enabled?: boolean;
  email_notifications_enabled?: boolean;
  task_assignment_notifications?: boolean;
  project_update_notifications?: boolean;
  comment_notifications?: boolean;
  compact_mode?: boolean;
}
