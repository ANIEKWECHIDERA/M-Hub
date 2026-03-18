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
import {
  chatAPI,
  type ChatConversation,
  type ChatConversationDetails,
  type ChatMessage,
  type ChatStreamEvent,
} from "@/api/chat.api";
import { getConversationSection, sortConversations, sortMessagesAscending, updateConversationPresence, upsertConversation } from "@/lib/chat";
import type { ChatSection } from "@/config/chat-nav";

type ChatContextType = {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  activeConversation: ChatConversation | null;
  conversationDetails: ChatConversationDetails | null;
  messages: ChatMessage[];
  loadingConversations: boolean;
  loadingMessages: boolean;
  error: string | null;
  setActiveConversationId: (conversationId: string | null) => void;
  refreshConversations: (options?: { silent?: boolean }) => Promise<void>;
  refreshActiveConversation: (options?: { silent?: boolean }) => Promise<void>;
  sendMessage: (body: string) => Promise<void>;
  sendTypingIndicator: (isTyping: boolean) => Promise<void>;
  typingUserIds: string[];
  totalUnreadCount: number;
  unreadBySection: Record<ChatSection, number>;
};

const ChatContext = createContext<ChatContextType | null>(null);

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
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  );
  const [conversationDetails, setConversationDetails] =
    useState<ChatConversationDetails | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingMap, setTypingMap] = useState<Record<string, Record<string, boolean>>>(
    {},
  );
  const streamRef = useRef<EventSource | null>(null);
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
    setActiveConversationId(null);
    setConversationDetails(null);
    setMessages([]);
    setTypingMap({});
    setError(null);
    setLoadingConversations(false);
    setLoadingMessages(false);
    conversationsRefreshRef.current = null;
    activeRefreshRef.current = null;
    lastReadMessageIdRef.current = null;
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
          setMessages(sortMessagesAscending(messagesResponse.messages ?? []));
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

  const sendMessage = useCallback(async (body: string) => {
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
      message_type: "text",
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
      tags: [],
      reply_to: null,
      is_edited: false,
      is_deleted: false,
    };

    setMessages((prev) => sortMessagesAscending([...prev, optimisticMessage]));

    try {
      const response = await chatAPI.sendMessage(
        conversationId,
        { body: body.trim() },
        token,
      );

      setMessages((prev) =>
        sortMessagesAscending(
          prev.map((message) =>
            message.id === optimisticId ? response.message : message,
          ),
        ),
      );
      await refreshConversations({ silent: true });
      await markActiveConversationRead();
    } catch (chatError: any) {
      setMessages((prev) =>
        prev.filter((message) => message.id !== optimisticId),
      );
      throw chatError;
    }
  }, [authStatus?.companyId, markActiveConversationRead, profile, refreshConversations]);

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

    void refreshConversations();
  }, [refreshConversations, resetState, scopeKey]);

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
          setConversations((prev) =>
            prev.map((conversation) =>
              updateConversationPresence(conversation, payload.user_id, payload.online),
            ),
          );
          setConversationDetails((prev) =>
            prev ? updateConversationPresence(prev, payload.user_id, payload.online) : prev,
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

        void refreshConversations({ silent: true });

        if (payload.conversation_id === activeConversationIdRef.current) {
          void refreshActiveConversation({ silent: true });
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
  }, [authStatus?.companyId, refreshActiveConversation, refreshConversations, scopeKey]);

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
      all: 0,
      projects: 0,
      direct: 0,
    };

    for (const conversation of conversations) {
      next.all += conversation.unread_count ?? 0;
      next[getConversationSection(conversation)] += conversation.unread_count ?? 0;
    }

    return next;
  }, [conversations]);

  const totalUnreadCount = unreadBySection.all;

  const value = useMemo<ChatContextType>(
    () => ({
      conversations,
      activeConversationId,
      activeConversation,
      conversationDetails,
      messages,
      loadingConversations,
      loadingMessages,
      error,
      setActiveConversationId,
      refreshConversations,
      refreshActiveConversation,
      sendMessage,
      sendTypingIndicator,
      typingUserIds,
      totalUnreadCount,
      unreadBySection,
    }),
    [
      conversations,
      activeConversationId,
      activeConversation,
      conversationDetails,
      messages,
      loadingConversations,
      loadingMessages,
      error,
      refreshConversations,
      refreshActiveConversation,
      sendMessage,
      sendTypingIndicator,
      typingUserIds,
      totalUnreadCount,
      unreadBySection,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
