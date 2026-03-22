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

export interface NotificationListResponseDTO {
  notifications: NotificationResponseDTO[];
  unreadCount: number;
}

export type NotificationStreamEvent =
  | {
      type: "notification.created";
      user_id: string;
      company_id: string;
      notification: NotificationResponseDTO;
    }
  | {
      type: "notification.read";
      user_id: string;
      company_id: string;
      notificationId: string;
    }
  | {
      type: "notification.read_all";
      user_id: string;
      company_id: string;
    }
  | {
      type: "notification.deleted";
      user_id: string;
      company_id: string;
      notificationId: string;
    }
  | {
      type: "notification.cleared_all";
      user_id: string;
      company_id: string;
    };
