import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { API_CONFIG } from "@/lib/api";
import { useAuthContext } from "./AuthContext";
import { useUser } from "./UserContext";
import { teamMembersAPI } from "@/api/teamMember.api";
import type { TeamMember } from "@/Types/types";
import {
  chatAPI,
  type ChatConversation,
  type ChatConversationDetails,
  type ChatMessage,
  type ChatStreamEvent,
} from "@/api/chat.api";
import {
  getConversationSection,
  sortConversations,
  sortMessagesAscending,
  updateConversationPresence,
  upsertConversation,
} from "@/lib/chat";
import type { ChatSection } from "@/config/chat-nav";

type ChatContextType = {
  conversations: ChatConversation[];
  workspaceMembers: TeamMember[];
  activeConversationId: string | null;
  activeConversation: ChatConversation | null;
  conversationDetails: ChatConversationDetails | null;
  messages: ChatMessage[];
  loadingConversations: boolean;
  loadingMessages: boolean;
  loadingWorkspaceMembers: boolean;
  loadingOlderMessages: boolean;
  hasMoreMessages: boolean;
  error: string | null;
  setActiveConversationId: (conversationId: string | null) => void;
  refreshConversations: (options?: { silent?: boolean }) => Promise<void>;
  refreshActiveConversation: (options?: { silent?: boolean }) => Promise<void>;
  refreshWorkspaceMembers: () => Promise<void>;
  loadOlderMessages: () => Promise<void>;
  sendMessage: (body: string, options?: { tags?: string[] }) => Promise<void>;
  sendTypingIndicator: (isTyping: boolean) => Promise<void>;
  createDirectConversation: (target: {
    target_user_id?: string;
    target_team_member_id?: string;
  }) => Promise<string>;
  createGroupConversation: (payload: {
    name: string;
    metadata?: Record<string, unknown>;
    participant_user_ids?: string[];
    participant_team_member_ids?: string[];
  }) => Promise<string>;
  renameConversation: (name: string) => Promise<void>;
  addConversationMembers: (payload: {
    participant_user_ids?: string[];
    participant_team_member_ids?: string[];
  }) => Promise<void>;
  removeConversationMember: (userId: string) => Promise<void>;
  updateConversationPreferences: (notificationsMuted: boolean) => Promise<void>;
  editMessage: (messageId: string, body: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  typingUserIds: string[];
  presenceByUserId: Record<string, boolean>;
  totalUnreadCount: number;
  unreadBySection: Record<ChatSection, number>;
};

const ChatContext = createContext<ChatContextType | null>(null);

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const map = new Map<string, ChatMessage>();
  [...current, ...incoming].forEach((message) => {
    map.set(message.id, message);
  });
  return sortMessagesAscending(Array.from(map.values()));
}

function updateConversationById(
  current: ChatConversation[],
  conversationId: string,
  updater: (conversation: ChatConversation) => ChatConversation,
) {
  return sortConversations(
    current.map((conversation) =>
      conversation.id === conversationId ? updater(conversation) : conversation,
    ),
  );
}

function normalizeConversation(
  conversation: Partial<ChatConversation> & Pick<ChatConversation, "id" | "type">,
): ChatConversation {
  return {
    company_id: "",
    direct_key: null,
    name: null,
    created_by: "",
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    last_message_at: null,
    archived_at: null,
    metadata: null,
    notifications_muted: false,
    last_read_message_id: null,
    last_read_at: null,
    unread_count: 0,
    member_count: 0,
    last_message: null,
    members: [],
    ...conversation,
    members: conversation.members ?? [],
    member_count:
      conversation.member_count ?? conversation.members?.length ?? 0,
  };
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within ChatProvider");
  }
  return context;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { idToken, authStatus, currentUser } = useAuthContext();
  const { profile } = useUser();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<TeamMember[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  );
  const [conversationDetails, setConversationDetails] =
    useState<ChatConversationDetails | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingWorkspaceMembers, setLoadingWorkspaceMembers] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingMap, setTypingMap] = useState<Record<string, Record<string, boolean>>>(
    {},
  );
  const [presenceByUserId, setPresenceByUserId] = useState<Record<string, boolean>>(
    {},
  );
  const [nextMessageCursor, setNextMessageCursor] = useState<string | null>(null);
  const streamRef = useRef<EventSource | null>(null);
  const conversationsRefreshTimeoutRef = useRef<number | null>(null);
  const activeRefreshTimeoutRef = useRef<number | null>(null);
  const idTokenRef = useRef<string | null>(idToken);
  const activeConversationIdRef = useRef<string | null>(activeConversationId);
  const conversationsRefreshRef = useRef<Promise<void> | null>(null);
  const activeRefreshRef = useRef<Promise<void> | null>(null);
  const scopeKey =
    Boolean(idToken) &&
    Boolean(currentUser) &&
    authStatus?.onboardingState === "ACTIVE" &&
    Boolean(authStatus.companyId)
      ? `${currentUser?.uid}:${authStatus?.companyId}`
      : null;
  const scopeKeyRef = useRef<string | null>(scopeKey);
  const lastReadMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    idTokenRef.current = idToken;
  }, [idToken]);

  useEffect(() => {
    scopeKeyRef.current = scopeKey;
  }, [scopeKey]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const resetState = useCallback(() => {
    setConversations([]);
    setWorkspaceMembers([]);
    setActiveConversationId(null);
    setConversationDetails(null);
    setMessages([]);
    setTypingMap({});
    setPresenceByUserId({});
    setNextMessageCursor(null);
    setError(null);
    setLoadingConversations(false);
    setLoadingMessages(false);
    setLoadingWorkspaceMembers(false);
    setLoadingOlderMessages(false);
    conversationsRefreshRef.current = null;
    activeRefreshRef.current = null;
    if (conversationsRefreshTimeoutRef.current) {
      window.clearTimeout(conversationsRefreshTimeoutRef.current);
      conversationsRefreshTimeoutRef.current = null;
    }
    if (activeRefreshTimeoutRef.current) {
      window.clearTimeout(activeRefreshTimeoutRef.current);
      activeRefreshTimeoutRef.current = null;
    }
    lastReadMessageIdRef.current = null;
  }, []);

  const refreshWorkspaceMembers = useCallback(async () => {
    const token = idTokenRef.current;

    if (!token || !scopeKeyRef.current) {
      setWorkspaceMembers([]);
      return;
    }

    setLoadingWorkspaceMembers(true);
    try {
      const members = await teamMembersAPI.getAll(token);
      if (!scopeKeyRef.current) {
        return;
      }
      setWorkspaceMembers(members ?? []);
    } catch (memberError: any) {
      setError(memberError.message || "Failed to load workspace members");
    } finally {
      setLoadingWorkspaceMembers(false);
    }
  }, []);

  const refreshConversations = useCallback(
    async (options?: { silent?: boolean }) => {
      const token = idTokenRef.current;
      const requestScope = scopeKeyRef.current;

      if (!token || !requestScope) {
        resetState();
        return;
      }

      if (conversationsRefreshRef.current) {
        return conversationsRefreshRef.current;
      }

      const silent = options?.silent ?? false;
      const request = (async () => {
        if (!silent) {
          setLoadingConversations(true);
        }

        try {
          const response = await chatAPI.listConversations(token);
          if (scopeKeyRef.current !== requestScope) {
            return;
          }

          setConversations(sortConversations(response.conversations ?? []));
          setError(null);
        } catch (chatError: any) {
          if (scopeKeyRef.current === requestScope) {
            setError(chatError.message || "Failed to load chats");
          }
        } finally {
          if (!silent) {
            setLoadingConversations(false);
          }
        }
      })();

      conversationsRefreshRef.current = request;
      try {
        await request;
      } finally {
        if (conversationsRefreshRef.current === request) {
          conversationsRefreshRef.current = null;
        }
      }
    },
    [resetState],
  );

  const refreshActiveConversation = useCallback(
    async (options?: { silent?: boolean }) => {
      const token = idTokenRef.current;
      const conversationId = activeConversationIdRef.current;
      const requestScope = scopeKeyRef.current;

      if (!token || !requestScope || !conversationId) {
        setConversationDetails(null);
        setMessages([]);
        setNextMessageCursor(null);
        lastReadMessageIdRef.current = null;
        return;
      }

      if (activeRefreshRef.current) {
        return activeRefreshRef.current;
      }

      const silent = options?.silent ?? false;
      const request = (async () => {
        if (!silent) {
          setLoadingMessages(true);
        }

        try {
          const [detailsResponse, messagesResponse] = await Promise.all([
            chatAPI.getConversation(conversationId, token),
            chatAPI.listMessages(conversationId, token),
          ]);

          if (
            scopeKeyRef.current !== requestScope ||
            activeConversationIdRef.current !== conversationId
          ) {
            return;
          }

          setConversationDetails(detailsResponse.conversation);
          setMessages((prev) =>
            mergeMessages(
              silent && prev.length ? prev : [],
              messagesResponse.messages ?? [],
            ),
          );
          setNextMessageCursor(messagesResponse.nextCursor);
          setConversations((prev) =>
            sortConversations(
              prev.map((conversation) =>
                conversation.id === detailsResponse.conversation.id
                  ? {
                      ...conversation,
                      members: detailsResponse.conversation.members,
                      member_count: detailsResponse.conversation.member_count,
                      last_message:
                        detailsResponse.conversation.last_message ??
                        conversation.last_message,
                      name: detailsResponse.conversation.name,
                      updated_at: detailsResponse.conversation.updated_at,
                      archived_at: detailsResponse.conversation.archived_at,
                      metadata: detailsResponse.conversation.metadata,
                    }
                  : conversation,
              ),
            ),
          );
          setError(null);
        } catch (chatError: any) {
          if (scopeKeyRef.current === requestScope) {
            setError(chatError.message || "Failed to load conversation");
          }
        } finally {
          if (!silent) {
            setLoadingMessages(false);
          }
        }
      })();

      activeRefreshRef.current = request;
      try {
        await request;
      } finally {
        if (activeRefreshRef.current === request) {
          activeRefreshRef.current = null;
        }
      }
    },
    [],
  );

  const scheduleRefreshConversations = useCallback(
    (options?: { silent?: boolean; delayMs?: number }) => {
      if (conversationsRefreshTimeoutRef.current) {
        window.clearTimeout(conversationsRefreshTimeoutRef.current);
      }

      conversationsRefreshTimeoutRef.current = window.setTimeout(() => {
        conversationsRefreshTimeoutRef.current = null;
        void refreshConversations({ silent: options?.silent ?? true });
      }, options?.delayMs ?? 120);
    },
    [refreshConversations],
  );

  const scheduleRefreshActiveConversation = useCallback(
    (options?: { silent?: boolean; delayMs?: number }) => {
      if (activeRefreshTimeoutRef.current) {
        window.clearTimeout(activeRefreshTimeoutRef.current);
      }

      activeRefreshTimeoutRef.current = window.setTimeout(() => {
        activeRefreshTimeoutRef.current = null;
        void refreshActiveConversation({ silent: options?.silent ?? true });
      }, options?.delayMs ?? 120);
    },
    [refreshActiveConversation],
  );

  const loadOlderMessages = useCallback(async () => {
    const token = idTokenRef.current;
    const conversationId = activeConversationIdRef.current;
    const cursor = nextMessageCursor;

    if (!token || !conversationId || !cursor) {
      return;
    }

    setLoadingOlderMessages(true);
    try {
      const response = await chatAPI.listMessages(conversationId, token, cursor);
      if (activeConversationIdRef.current !== conversationId) {
        return;
      }
      setMessages((prev) => mergeMessages(prev, response.messages ?? []));
      setNextMessageCursor(response.nextCursor);
    } catch (chatError: any) {
      setError(chatError.message || "Failed to load older messages");
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [nextMessageCursor]);

  const markActiveConversationRead = useCallback(async () => {
    const token = idTokenRef.current;
    const conversationId = activeConversationIdRef.current;
    if (!token || !conversationId || !messages.length) {
      return;
    }

    const latestMessageId = messages[messages.length - 1]?.id ?? null;
    if (!latestMessageId || lastReadMessageIdRef.current === latestMessageId) {
      return;
    }
    if (latestMessageId.startsWith("optimistic-")) {
      return;
    }

    lastReadMessageIdRef.current = latestMessageId;

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              unread_count: 0,
              last_read_message_id: latestMessageId,
              last_read_at: new Date().toISOString(),
            }
          : conversation,
      ),
    );

    try {
      await chatAPI.markConversationRead(
        conversationId,
        { last_read_message_id: latestMessageId },
        token,
      );
    } catch {
      // Let the next fetch reconcile unread state if this fails.
    }
  }, [messages]);

  const openConversation = useCallback((conversation: ChatConversation) => {
    const normalizedConversation = normalizeConversation(conversation);
    setActiveConversationId(normalizedConversation.id);
    setConversations((prev) =>
      sortConversations(upsertConversation(prev, normalizedConversation)),
    );
  }, []);

  const createDirectConversation = useCallback(
    async (target: {
      target_user_id?: string;
      target_team_member_id?: string;
    }) => {
      const token = idTokenRef.current;
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await chatAPI.createDirectConversation(target, token);
      openConversation(response.conversation);
      return response.conversation.id;
    },
    [openConversation],
  );

  const createGroupConversation = useCallback(
    async (payload: {
      name: string;
      metadata?: Record<string, unknown>;
      participant_user_ids?: string[];
      participant_team_member_ids?: string[];
    }) => {
      const token = idTokenRef.current;
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await chatAPI.createGroupConversation(payload, token);
      openConversation(response.conversation);
      return response.conversation.id;
    },
    [openConversation],
  );

  const renameConversation = useCallback(async (name: string) => {
    const token = idTokenRef.current;
    const conversationId = activeConversationIdRef.current;
    if (!token || !conversationId) {
      return;
    }

    const trimmedName = name.trim();
    const previousConversation = conversations.find(
      (conversation) => conversation.id === conversationId,
    );
    const previousDetails = conversationDetails;
    const updatedAt = new Date().toISOString();

    setConversations((prev) =>
      updateConversationById(prev, conversationId, (conversation) => ({
        ...conversation,
        name: trimmedName,
        updated_at: updatedAt,
      })),
    );
    setConversationDetails((prev) =>
      prev && prev.id === conversationId
        ? { ...prev, name: trimmedName, updated_at: updatedAt }
        : prev,
    );

    try {
      await chatAPI.renameConversation(conversationId, trimmedName, token);
      scheduleRefreshConversations({ silent: true });
      scheduleRefreshActiveConversation({ silent: true });
    } catch (error) {
      if (previousConversation) {
        setConversations((prev) =>
          updateConversationById(prev, conversationId, () => previousConversation),
        );
      }
      setConversationDetails(previousDetails);
      throw error;
    }
  }, [
    conversationDetails,
    conversations,
    scheduleRefreshActiveConversation,
    scheduleRefreshConversations,
  ]);

  const addConversationMembers = useCallback(
    async (payload: {
      participant_user_ids?: string[];
      participant_team_member_ids?: string[];
    }) => {
      const token = idTokenRef.current;
      const conversationId = activeConversationIdRef.current;
      if (!token || !conversationId) {
        return;
      }

      const selectedMembers = workspaceMembers.filter(
        (member) =>
          (member.user_id && payload.participant_user_ids?.includes(member.user_id)) ||
          payload.participant_team_member_ids?.includes(member.id),
      );
      const optimisticMembers = selectedMembers.map((member) => ({
        id: `optimistic-member:${conversationId}:${member.id}`,
        user_id: member.user_id ?? "",
        team_member_id: member.id,
        name: member.name,
        email: member.email,
        avatar: member.avatar,
        online: member.user_id ? Boolean(presenceByUserId[member.user_id]) : false,
        role: member.role,
        access: member.access,
        joined_at: new Date().toISOString(),
        notifications_muted: false,
      }));
      const previousConversation = conversations.find(
        (conversation) => conversation.id === conversationId,
      );
      const previousDetails = conversationDetails;

      setConversations((prev) =>
        updateConversationById(prev, conversationId, (conversation) => ({
          ...conversation,
          member_count: conversation.member_count + optimisticMembers.length,
          members: [...conversation.members, ...optimisticMembers],
        })),
      );
      setConversationDetails((prev) =>
        prev && prev.id === conversationId
          ? {
              ...prev,
              member_count: prev.member_count + optimisticMembers.length,
              members: [...prev.members, ...optimisticMembers],
            }
          : prev,
      );

      try {
        await chatAPI.addMembers(conversationId, payload, token);
        scheduleRefreshConversations({ silent: true });
        scheduleRefreshActiveConversation({ silent: true });
      } catch (error) {
        if (previousConversation) {
          setConversations((prev) =>
            updateConversationById(prev, conversationId, () => previousConversation),
          );
        }
        setConversationDetails(previousDetails);
        throw error;
      }
    },
    [
      conversationDetails,
      conversations,
      presenceByUserId,
      scheduleRefreshActiveConversation,
      scheduleRefreshConversations,
      workspaceMembers,
    ],
  );

  const removeConversationMember = useCallback(
    async (userId: string) => {
      const token = idTokenRef.current;
      const conversationId = activeConversationIdRef.current;
      if (!token || !conversationId) {
        return;
      }

      const previousConversation = conversations.find(
        (conversation) => conversation.id === conversationId,
      );
      const previousDetails = conversationDetails;

      setConversations((prev) =>
        updateConversationById(prev, conversationId, (conversation) => ({
          ...conversation,
          member_count: Math.max(0, conversation.member_count - 1),
          members: conversation.members.filter((member) => member.user_id !== userId),
        })),
      );
      setConversationDetails((prev) =>
        prev && prev.id === conversationId
          ? {
              ...prev,
              member_count: Math.max(0, prev.member_count - 1),
              members: prev.members.filter((member) => member.user_id !== userId),
            }
          : prev,
      );

      try {
        await chatAPI.removeMember(conversationId, userId, token);
        scheduleRefreshConversations({ silent: true });
        scheduleRefreshActiveConversation({ silent: true });
      } catch (error) {
        if (previousConversation) {
          setConversations((prev) =>
            updateConversationById(prev, conversationId, () => previousConversation),
          );
        }
        setConversationDetails(previousDetails);
        throw error;
      }
    },
    [
      conversationDetails,
      conversations,
      scheduleRefreshActiveConversation,
      scheduleRefreshConversations,
    ],
  );

  const updateConversationPreferences = useCallback(
    async (notificationsMuted: boolean) => {
      const token = idTokenRef.current;
      const conversationId = activeConversationIdRef.current;
      if (!token || !conversationId) {
        return;
      }

      const previousConversation = conversations.find(
        (conversation) => conversation.id === conversationId,
      );

      setConversations((prev) =>
        updateConversationById(prev, conversationId, (conversation) => ({
          ...conversation,
          notifications_muted: notificationsMuted,
        })),
      );

      try {
        const response = await chatAPI.updatePreferences(
          conversationId,
          notificationsMuted,
          token,
        );

        setConversations((prev) =>
          updateConversationById(prev, conversationId, (conversation) => ({
            ...conversation,
            notifications_muted: response.notifications_muted,
          })),
        );
      } catch (error) {
        if (previousConversation) {
          setConversations((prev) =>
            updateConversationById(prev, conversationId, () => previousConversation),
          );
        }
        throw error;
      }
    },
    [conversations],
  );

  const sendMessage = useCallback(
    async (body: string, options?: { tags?: string[] }) => {
      const token = idTokenRef.current;
      const conversationId = activeConversationIdRef.current;
      if (!token || !conversationId || !body.trim()) {
        return;
      }

      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticMessage: ChatMessage = {
        id: optimisticId,
        conversation_id: conversationId,
        company_id: authStatus?.companyId ?? "",
        sender_team_member_id: null,
        body: body.trim(),
        message_type: options?.tags?.length ? "tagged" : "text",
        edited_at: null,
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        reply_to_message_id: null,
        metadata: null,
        sender: {
          team_member_id: null,
          user_id: profile?.id ?? null,
          name:
            [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
            profile?.displayName ||
            profile?.email ||
            "You",
          avatar: profile?.photoURL ?? null,
        },
        tags: options?.tags ?? [],
        reply_to: null,
        is_edited: false,
        is_deleted: false,
      };

      setMessages((prev) => mergeMessages(prev, [optimisticMessage]));

      try {
        const response = await chatAPI.sendMessage(
          conversationId,
          { body: body.trim(), tags: options?.tags },
          token,
        );

        setMessages((prev) =>
          mergeMessages(
            prev.filter((message) => message.id !== optimisticId),
            [response.message],
          ),
        );
        setConversations((prev) =>
          updateConversationById(prev, conversationId, (conversation) => ({
            ...conversation,
            last_message: response.message,
            last_message_at: response.message.created_at,
            unread_count: 0,
            last_read_message_id: response.message.id,
            last_read_at: response.message.created_at,
          })),
        );
        lastReadMessageIdRef.current = response.message.id;
      } catch (chatError: any) {
        setMessages((prev) =>
          prev.filter((message) => message.id !== optimisticId),
        );
        throw chatError;
      }
    },
    [authStatus?.companyId, profile],
  );

  const editMessage = useCallback(async (messageId: string, body: string) => {
    const token = idTokenRef.current;
    if (!token) {
      return;
    }

    const previousMessage = messages.find((message) => message.id === messageId) ?? null;
    const optimisticEditedAt = new Date().toISOString();

    setMessages((prev) =>
      mergeMessages(
        prev.map((message) =>
          message.id === messageId
            ? {
                ...message,
                body,
                edited_at: optimisticEditedAt,
                updated_at: optimisticEditedAt,
                is_edited: true,
              }
            : message,
        ),
        [],
      ),
    );

    try {
      const response = await chatAPI.editMessage(messageId, body, token);
      setMessages((prev) =>
        mergeMessages(
          prev.map((message) =>
            message.id === messageId ? response.message : message,
          ),
          [],
        ),
      );
      scheduleRefreshConversations({ silent: true });
    } catch (error) {
      if (previousMessage) {
        setMessages((prev) =>
          mergeMessages(
            prev.map((message) =>
              message.id === messageId ? previousMessage : message,
            ),
            [],
          ),
        );
      }
      throw error;
    }
  }, [messages, scheduleRefreshConversations]);

  const deleteMessage = useCallback(async (messageId: string) => {
    const token = idTokenRef.current;
    if (!token) {
      return;
    }

    const previousMessage = messages.find((message) => message.id === messageId) ?? null;
    const deletedAt = new Date().toISOString();

    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? {
              ...message,
              body: "Message deleted",
              deleted_at: deletedAt,
              is_deleted: true,
            }
          : message,
      ),
    );

    try {
      await chatAPI.deleteMessage(messageId, token);
      scheduleRefreshConversations({ silent: true });
    } catch (error) {
      if (previousMessage) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === messageId ? previousMessage : message,
          ),
        );
      }
      throw error;
    }
  }, [messages, scheduleRefreshConversations]);

  const sendTypingIndicator = useCallback(async (isTyping: boolean) => {
    const token = idTokenRef.current;
    const conversationId = activeConversationIdRef.current;
    if (!token || !conversationId) {
      return;
    }

    try {
      await chatAPI.sendTypingIndicator(conversationId, isTyping, token);
    } catch {
      // Typing is ephemeral; ignore network failures and let the UI recover.
    }
  }, []);

  useEffect(() => {
    resetState();
    if (!scopeKey) {
      return;
    }

    void Promise.all([refreshConversations(), refreshWorkspaceMembers()]);
  }, [refreshConversations, refreshWorkspaceMembers, resetState, scopeKey]);

  useEffect(() => {
    if (!scopeKey || !conversations.length) {
      return;
    }

    if (
      activeConversationId &&
      conversations.some((conversation) => conversation.id === activeConversationId)
    ) {
      return;
    }

    setActiveConversationId(conversations[0]?.id ?? null);
  }, [activeConversationId, conversations, scopeKey]);

  useEffect(() => {
    if (!scopeKey || !activeConversationId) {
      setConversationDetails(null);
      setMessages([]);
      setNextMessageCursor(null);
      lastReadMessageIdRef.current = null;
      return;
    }

    void refreshActiveConversation();
  }, [activeConversationId, refreshActiveConversation, scopeKey]);

  useEffect(() => {
    if (!activeConversationId || !messages.length) {
      return;
    }

    void markActiveConversationRead();
  }, [activeConversationId, markActiveConversationRead, messages]);

  useEffect(() => {
    if (!scopeKey || !idTokenRef.current) {
      streamRef.current?.close();
      streamRef.current = null;
      return;
    }

    const stream = new EventSource(
      `${API_CONFIG.backend}/api/chat/stream?token=${encodeURIComponent(
        idTokenRef.current,
      )}`,
    );

    const handleChatEvent = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as ChatStreamEvent;
        if (payload.company_id !== authStatus?.companyId) {
          return;
        }

        if (payload.type === "chat.presence") {
          setPresenceByUserId((prev) => ({
            ...prev,
            [payload.user_id]: payload.online,
          }));
          setConversations((prev) =>
            prev.map((conversation) =>
              updateConversationPresence(
                conversation,
                payload.user_id,
                payload.online,
              ),
            ),
          );
          setConversationDetails((prev) =>
            prev
              ? updateConversationPresence(prev, payload.user_id, payload.online)
              : prev,
          );
          return;
        }

        if (payload.type === "chat.typing") {
          setTypingMap((prev) => {
            const conversationTyping = { ...(prev[payload.conversation_id] ?? {}) };
            if (payload.isTyping) {
              conversationTyping[payload.user_id] = true;
            } else {
              delete conversationTyping[payload.user_id];
            }

            return {
              ...prev,
              [payload.conversation_id]: conversationTyping,
            };
          });
          return;
        }

        if (
          "conversation_id" in payload &&
          payload.conversation_id === activeConversationIdRef.current
        ) {
          scheduleRefreshActiveConversation({ silent: true });
        }

        if (payload.type !== "chat.message.updated") {
          scheduleRefreshConversations({ silent: true });
        }
      } catch {
        // Ignore malformed events and let the next fetch reconcile state.
      }
    };

    stream.addEventListener("chat", handleChatEvent);
    streamRef.current = stream;

    return () => {
      stream.removeEventListener("chat", handleChatEvent);
      stream.close();
      streamRef.current = null;
    };
  }, [
    authStatus?.companyId,
    scheduleRefreshActiveConversation,
    scheduleRefreshConversations,
    scopeKey,
  ]);

  const activeConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === activeConversationId) ??
      null,
    [activeConversationId, conversations],
  );

  const typingUserIds = useMemo(() => {
    const typingUsers = typingMap[activeConversationId ?? ""] ?? {};
    return Object.keys(typingUsers).filter((userId) => userId !== profile?.id);
  }, [activeConversationId, profile?.id, typingMap]);

  const unreadBySection = useMemo(() => {
    const next: Record<ChatSection, number> = {
      projects: 0,
      direct: 0,
    };

    for (const conversation of conversations) {
      next[getConversationSection(conversation)] += conversation.unread_count ?? 0;
    }

    return next;
  }, [conversations]);

  const totalUnreadCount = useMemo(
    () =>
      conversations.reduce(
        (sum, conversation) => sum + (conversation.unread_count ?? 0),
        0,
      ),
    [conversations],
  );

  const value = useMemo<ChatContextType>(
    () => ({
      conversations,
      workspaceMembers,
      activeConversationId,
      activeConversation,
      conversationDetails,
      messages,
      loadingConversations,
      loadingMessages,
      loadingWorkspaceMembers,
      loadingOlderMessages,
      hasMoreMessages: Boolean(nextMessageCursor),
      error,
      setActiveConversationId,
      refreshConversations,
      refreshActiveConversation,
      refreshWorkspaceMembers,
      loadOlderMessages,
      sendMessage,
      sendTypingIndicator,
      createDirectConversation,
      createGroupConversation,
      renameConversation,
      addConversationMembers,
      removeConversationMember,
      updateConversationPreferences,
      editMessage,
      deleteMessage,
      typingUserIds,
      presenceByUserId,
      totalUnreadCount,
      unreadBySection,
    }),
    [
      conversations,
      workspaceMembers,
      activeConversationId,
      activeConversation,
      conversationDetails,
      messages,
      loadingConversations,
      loadingMessages,
      loadingWorkspaceMembers,
      loadingOlderMessages,
      nextMessageCursor,
      error,
      refreshConversations,
      refreshActiveConversation,
      refreshWorkspaceMembers,
      loadOlderMessages,
      sendMessage,
      sendTypingIndicator,
      createDirectConversation,
      createGroupConversation,
      renameConversation,
      addConversationMembers,
      removeConversationMember,
      updateConversationPreferences,
      editMessage,
      deleteMessage,
      typingUserIds,
      presenceByUserId,
      totalUnreadCount,
      unreadBySection,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
