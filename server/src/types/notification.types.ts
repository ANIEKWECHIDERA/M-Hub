export interface CreateNotificationDTO {
  user_id: string;
  company_id: string;
  type: string;
  title: string;
  message: string;
}

export interface NotificationResponseDTO {
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
