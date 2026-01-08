export interface UserSettingsResponseDTO {
  id: string;
  user_id: string;
  theme: string;
  language: string;
  notifications_enabled: boolean;
  compact_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateUserSettingsDTO {
  theme?: "light" | "dark";
  language?: string;
  notifications_enabled?: boolean;
  compact_mode?: boolean;
}
