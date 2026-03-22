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
  "decision",
  "action-item",
  "blocker",
  "update",
  "question",
  "follow-up",
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

export type ChatConversationMemberSummary = {
  id: string;
  user_id: string;
  team_member_id: string;
  name: string;
  email: string;
  avatar: string | null;
  online: boolean;
  role: string | null;
  access: string | null;
  joined_at: string;
  notifications_muted: boolean;
};

export type ChatMessageSummary = {
  id: string;
  body: string;
  message_type: ChatMessageType;
  created_at: string;
  edited_at: string | null;
  deleted_at?: string | null;
  sender: {
    team_member_id: string | null;
    user_id: string | null;
    name: string | null;
    avatar: string | null;
  };
};

export type ChatMessageListItem = ChatMessageRecord & {
  sender: {
    team_member_id: string | null;
    user_id: string | null;
    name: string | null;
    avatar: string | null;
  };
  tags: string[];
  reply_to: ChatMessageSummary | null;
  is_edited: boolean;
  is_deleted: boolean;
};

export type ChatConversationListItem = ChatConversationRecord & {
  notifications_muted: boolean;
  last_read_message_id: string | null;
  last_read_at: string | null;
  unread_count: number;
  member_count: number;
  last_message: ChatMessageSummary | null;
  members: ChatConversationMemberSummary[];
};

export type ChatConversationPermissions = {
  can_view: boolean;
  can_send_messages: boolean;
  can_rename_group: boolean;
  can_manage_members: boolean;
  can_moderate_messages: boolean;
  can_delete_conversation: boolean;
};

export type ChatConversationDetails = ChatConversationRecord & {
  member_count: number;
  members: ChatConversationMemberSummary[];
  permissions: ChatConversationPermissions;
  last_message: ChatMessageSummary | null;
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
  requester_access?: string | null;
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

export type MarkConversationReadDTO = {
  last_read_message_id?: string | null;
  last_read_at?: string | null;
};

export type UpdateChatMessageTagsDTO = {
  tags: string[];
};

export type ChatRealtimeEvent =
  | {
      type: "chat.conversation.created";
      company_id: string;
      conversation_id: string;
      user_ids: string[];
    }
  | {
      type: "chat.conversation.updated";
      company_id: string;
      conversation_id: string;
      user_ids: string[];
    }
  | {
      type: "chat.message.created";
      company_id: string;
      conversation_id: string;
      message_id: string;
      user_ids: string[];
    }
  | {
      type: "chat.message.updated";
      company_id: string;
      conversation_id: string;
      message_id: string;
      user_ids: string[];
    }
  | {
      type: "chat.message.deleted";
      company_id: string;
      conversation_id: string;
      message_id: string;
      user_ids: string[];
    }
  | {
      type: "chat.member.added";
      company_id: string;
      conversation_id: string;
      user_id: string;
      actor_user_id: string;
      user_ids: string[];
    }
  | {
      type: "chat.member.removed";
      company_id: string;
      conversation_id: string;
      user_id: string;
      actor_user_id: string;
      user_ids: string[];
    }
  | {
      type: "chat.typing";
      company_id: string;
      conversation_id: string;
      user_id: string;
      isTyping: boolean;
      user_ids: string[];
    }
  | {
      type: "chat.presence";
      company_id: string;
      user_id: string;
      online: boolean;
      user_ids?: string[];
    };
