import { apiFetch } from "./http";

export type ChatMember = {
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
  message_type: "text" | "system" | "tagged" | "file" | "image";
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

export type ChatConversation = {
  id: string;
  company_id: string;
  type: "direct" | "group";
  direct_key: string | null;
  name: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  archived_at: string | null;
  metadata: Record<string, unknown> | null;
  notifications_muted: boolean;
  last_read_message_id: string | null;
  last_read_at: string | null;
  unread_count: number;
  member_count: number;
  last_message: ChatMessageSummary | null;
  members: ChatMember[];
};

export type ChatConversationDetails = {
  id: string;
  company_id: string;
  type: "direct" | "group";
  direct_key: string | null;
  name: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  archived_at: string | null;
  metadata: Record<string, unknown> | null;
  member_count: number;
  members: ChatMember[];
  permissions: {
    can_view: boolean;
    can_send_messages: boolean;
    can_rename_group: boolean;
    can_manage_members: boolean;
    can_moderate_messages: boolean;
  };
  last_message: ChatMessageSummary | null;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  company_id: string;
  sender_team_member_id: string | null;
  body: string;
  message_type: "text" | "system" | "tagged" | "file" | "image";
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  reply_to_message_id: string | null;
  metadata: Record<string, unknown> | null;
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

export type ChatStreamEvent =
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

export const chatAPI = {
  listConversations(idToken: string, cursorConversationId?: string | null) {
    const params = new URLSearchParams();
    params.set("limit", "50");
    if (cursorConversationId) {
      params.set("cursorConversationId", cursorConversationId);
    }

    return apiFetch<{
      conversations: ChatConversation[];
      nextCursor: string | null;
    }>(`/api/chat/conversations?${params.toString()}`, undefined, idToken);
  },

  getConversation(conversationId: string, idToken: string) {
    return apiFetch<{ conversation: ChatConversationDetails }>(
      `/api/chat/conversations/${conversationId}`,
      undefined,
      idToken,
    );
  },

  listMessages(
    conversationId: string,
    idToken: string,
    cursorMessageId?: string | null,
    limit = 50,
  ) {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (cursorMessageId) {
      params.set("cursorMessageId", cursorMessageId);
    }

    return apiFetch<{ messages: ChatMessage[]; nextCursor: string | null }>(
      `/api/chat/conversations/${conversationId}/messages?${params.toString()}`,
      undefined,
      idToken,
    );
  },

  sendMessage(
    conversationId: string,
    payload: {
      body: string;
      message_type?: "text" | "tagged";
      reply_to_message_id?: string | null;
      tags?: string[];
      metadata?: Record<string, unknown>;
    },
    idToken: string,
  ) {
    return apiFetch<{ message: ChatMessage }>(
      `/api/chat/conversations/${conversationId}/messages`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      idToken,
    );
  },

  createDirectConversation(
    payload: {
      target_user_id?: string;
      target_team_member_id?: string;
    },
    idToken: string,
  ) {
    return apiFetch<{ conversation: ChatConversation }>(
      "/api/chat/conversations/direct",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      idToken,
    );
  },

  createGroupConversation(
    payload: {
      name: string;
      participant_user_ids?: string[];
      participant_team_member_ids?: string[];
      metadata?: Record<string, unknown>;
    },
    idToken: string,
  ) {
    return apiFetch<{ conversation: ChatConversation }>(
      "/api/chat/conversations/group",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      idToken,
    );
  },

  renameConversation(
    conversationId: string,
    name: string,
    idToken: string,
  ) {
    return apiFetch<{ success: boolean }>(
      `/api/chat/conversations/${conversationId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name }),
      },
      idToken,
    );
  },

  addMembers(
    conversationId: string,
    payload: {
      participant_user_ids?: string[];
      participant_team_member_ids?: string[];
    },
    idToken: string,
  ) {
    return apiFetch<{ success: boolean }>(
      `/api/chat/conversations/${conversationId}/members`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      idToken,
    );
  },

  removeMember(conversationId: string, userId: string, idToken: string) {
    return apiFetch<{ success: boolean }>(
      `/api/chat/conversations/${conversationId}/members/${userId}`,
      { method: "DELETE" },
      idToken,
    );
  },

  updatePreferences(
    conversationId: string,
    notificationsMuted: boolean,
    idToken: string,
  ) {
    return apiFetch<{ success: boolean; notifications_muted: boolean }>(
      `/api/chat/conversations/${conversationId}/preferences`,
      {
        method: "PATCH",
        body: JSON.stringify({ notifications_muted: notificationsMuted }),
      },
      idToken,
    );
  },

  editMessage(messageId: string, body: string, idToken: string) {
    return apiFetch<{ message: ChatMessage }>(
      `/api/chat/messages/${messageId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ body }),
      },
      idToken,
    );
  },

  deleteMessage(messageId: string, idToken: string) {
    return apiFetch<{ success: boolean }>(
      `/api/chat/messages/${messageId}`,
      { method: "DELETE", body: JSON.stringify({}) },
      idToken,
    );
  },

  markConversationRead(
    conversationId: string,
    payload: { last_read_message_id?: string | null; last_read_at?: string | null },
    idToken: string,
  ) {
    return apiFetch<{ success: boolean }>(
      `/api/chat/conversations/${conversationId}/read`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      idToken,
    );
  },

  sendTypingIndicator(
    conversationId: string,
    isTyping: boolean,
    idToken: string,
  ) {
    return apiFetch<{ success: boolean }>(
      `/api/chat/conversations/${conversationId}/typing`,
      {
        method: "POST",
        body: JSON.stringify({ isTyping }),
      },
      idToken,
    );
  },
};
