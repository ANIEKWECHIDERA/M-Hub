export const CHAT_CONVERSATION_TYPES = ["direct", "group"] as const;
export type ChatConversationType = (typeof CHAT_CONVERSATION_TYPES)[number];

export const CHAT_MESSAGE_TYPES = [
  "text",
  "system",
  "tagged",
  "file",
  "image",
] as const;
export type ChatMessageType = (typeof CHAT_MESSAGE_TYPES)[number];

export const CHAT_MESSAGE_TAGS = [
  "urgent",
  "blocker",
  "announcement",
  "follow-up",
  "decision",
] as const;
export type ChatMessageTag = (typeof CHAT_MESSAGE_TAGS)[number];

export type ChatConversationRecord = {
  id: string;
  company_id: string;
  type: ChatConversationType;
  direct_key: string | null;
  name: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  archived_at: string | null;
  metadata: Record<string, unknown> | null;
};

export type ChatConversationMemberRecord = {
  id: string;
  conversation_id: string;
  user_id: string;
  team_member_id: string;
  joined_at: string;
  added_by: string | null;
  removed_at: string | null;
  removed_by: string | null;
  last_read_message_id: string | null;
  last_read_at: string | null;
  notifications_muted: boolean;
};

export type ChatMessageRecord = {
  id: string;
  conversation_id: string;
  company_id: string;
  sender_team_member_id: string | null;
  body: string;
  message_type: ChatMessageType;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  reply_to_message_id: string | null;
  metadata: Record<string, unknown> | null;
};

export type ChatMessageTagRecord = {
  id: string;
  message_id: string;
  tag: string;
  created_at: string;
  created_by: string;
};

export type ChatMessageEditRecord = {
  id: string;
  message_id: string;
  previous_body: string;
  edited_by: string;
  edited_at: string;
};

export type CreateDirectConversationDTO = {
  company_id: string;
  created_by: string;
  participant_user_ids: [string, string];
};

export type CreateGroupConversationDTO = {
  company_id: string;
  created_by: string;
  name: string;
  participant_user_ids: string[];
  metadata?: Record<string, unknown>;
};

export type AddConversationMembersDTO = {
  conversation_id: string;
  company_id: string;
  added_by: string;
  participant_user_ids: string[];
};

export type RemoveConversationMemberDTO = {
  conversation_id: string;
  company_id: string;
  removed_by: string;
  user_id: string;
};

export type CreateChatMessageDTO = {
  conversation_id: string;
  company_id: string;
  sender_team_member_id: string | null;
  body: string;
  message_type?: ChatMessageType;
  reply_to_message_id?: string | null;
  metadata?: Record<string, unknown>;
  tags?: string[];
};

export type UpdateChatMessageDTO = {
  body: string;
  edited_by: string;
};

export type ChatRealtimeEvent =
  | {
      type: "chat.message.created";
      company_id: string;
      conversation_id: string;
      message_id: string;
    }
  | {
      type: "chat.message.updated";
      company_id: string;
      conversation_id: string;
      message_id: string;
    }
  | {
      type: "chat.member.added";
      company_id: string;
      conversation_id: string;
      user_id: string;
    }
  | {
      type: "chat.member.removed";
      company_id: string;
      conversation_id: string;
      user_id: string;
    }
  | {
      type: "chat.typing";
      company_id: string;
      conversation_id: string;
      user_id: string;
      isTyping: boolean;
    }
  | {
      type: "chat.presence";
      company_id: string;
      user_id: string;
      online: boolean;
    };
