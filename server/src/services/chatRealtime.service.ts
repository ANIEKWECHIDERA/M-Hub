import { EventEmitter } from "events";
import { supabaseAdmin } from "../config/supabaseClient";
import { prisma } from "../lib/prisma";
import { ChatRealtimeEvent } from "../types/chat.types";
import { logger } from "../utils/logger";

const CHAT_TYPING_TTL_MS = 4000;

class ChatRealtimeService {
  private emitter = new EventEmitter();
  private presence = new Map<string, number>();
  private typingTimeouts = new Map<string, NodeJS.Timeout>();
  private initialized = false;
  private databaseChannel: ReturnType<typeof supabaseAdmin.channel> | null = null;
  private ephemeralChannel: ReturnType<typeof supabaseAdmin.channel> | null = null;

  subscribe(
    companyId: string,
    userId: string,
    listener: (event: ChatRealtimeEvent) => void,
  ) {
    const wrapped = (event: ChatRealtimeEvent) => {
      if (event.company_id !== companyId) {
        return;
      }

      if ("user_ids" in event && Array.isArray(event.user_ids)) {
        if (!event.user_ids.includes(userId)) {
          return;
        }
      }

      listener(event);
    };

    this.emitter.on("chat", wrapped);

    return () => {
      this.emitter.off("chat", wrapped);
    };
  }

  emit(event: ChatRealtimeEvent) {
    this.emitter.emit("chat", event);
  }

  async sendTypingIndicator(params: {
    companyId: string;
    conversationId: string;
    userId: string;
    userIds: string[];
    isTyping: boolean;
  }) {
    this.initialize();

    const result = await this.ephemeralChannel?.send({
      type: "broadcast",
      event: "typing",
      payload: {
        company_id: params.companyId,
        conversation_id: params.conversationId,
        user_id: params.userId,
        user_ids: params.userIds,
        isTyping: params.isTyping,
      },
    });

    if (result !== "ok") {
      logger.warn("chatRealtimeService: typing broadcast fallback", {
        result,
        conversationId: params.conversationId,
        userId: params.userId,
      });

      this.handleTypingPayload({
        company_id: params.companyId,
        conversation_id: params.conversationId,
        user_id: params.userId,
        user_ids: params.userIds,
        isTyping: params.isTyping,
      });
    }
  }

  markOnline(companyId: string, userId: string) {
    const key = `${companyId}:${userId}`;
    const count = this.presence.get(key) ?? 0;
    this.presence.set(key, count + 1);

    if (count === 0) {
      this.emit({
        type: "chat.presence",
        company_id: companyId,
        user_id: userId,
        online: true,
      });
    }
  }

  markOffline(companyId: string, userId: string) {
    const key = `${companyId}:${userId}`;
    const count = this.presence.get(key) ?? 0;

    if (count <= 1) {
      this.presence.delete(key);
      this.emit({
        type: "chat.presence",
        company_id: companyId,
        user_id: userId,
        online: false,
      });
      return;
    }

    this.presence.set(key, count - 1);
  }

  isOnline(companyId: string, userId: string) {
    return (this.presence.get(`${companyId}:${userId}`) ?? 0) > 0;
  }

  initialize() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    this.databaseChannel = supabaseAdmin
      .channel("chat-db-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          void this.handleMessageInsert(payload.new as Record<string, any>);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          void this.handleMessageUpdate(
            payload.new as Record<string, any>,
            payload.old as Record<string, any>,
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_conversations",
        },
        (payload) => {
          void this.handleConversationUpdate(payload.new as Record<string, any>);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_conversation_members",
        },
        (payload) => {
          void this.handleMemberInsert(payload.new as Record<string, any>);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_conversation_members",
        },
        (payload) => {
          void this.handleMemberUpdate(
            payload.new as Record<string, any>,
            payload.old as Record<string, any>,
          );
        },
      )
      .subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          logger.info("chatRealtimeService: Supabase chat realtime subscribed");
          return;
        }

        if (error) {
          logger.error("chatRealtimeService: subscription error", {
            status,
            error,
          });
        } else {
          logger.warn("chatRealtimeService: subscription status", { status });
        }
      });

    this.ephemeralChannel = supabaseAdmin
      .channel("chat-ephemeral")
      .on("broadcast", { event: "typing" }, (payload) => {
        this.handleTypingPayload(payload.payload as Record<string, any>);
      })
      .subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          logger.info("chatRealtimeService: Supabase chat ephemeral subscribed");
          return;
        }

        if (error) {
          logger.error("chatRealtimeService: ephemeral subscription error", {
            status,
            error,
          });
        } else {
          logger.warn("chatRealtimeService: ephemeral subscription status", {
            status,
          });
        }
      });
  }

  private buildTypingKey(conversationId: string, userId: string) {
    return `${conversationId}:${userId}`;
  }

  private clearTypingTimeout(conversationId: string, userId: string) {
    const key = this.buildTypingKey(conversationId, userId);
    const timeout = this.typingTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.typingTimeouts.delete(key);
    }
  }

  private handleTypingPayload(payload: Record<string, any>) {
    const companyId = String(payload.company_id ?? "");
    const conversationId = String(payload.conversation_id ?? "");
    const userId = String(payload.user_id ?? "");
    const userIds = Array.isArray(payload.user_ids)
      ? payload.user_ids.filter((value): value is string => typeof value === "string")
      : [];
    const isTyping = Boolean(payload.isTyping);

    if (!companyId || !conversationId || !userId) {
      return;
    }

    this.clearTypingTimeout(conversationId, userId);

    this.emit({
      type: "chat.typing",
      company_id: companyId,
      conversation_id: conversationId,
      user_id: userId,
      isTyping,
      user_ids: userIds,
    });

    if (!isTyping) {
      return;
    }

    const key = this.buildTypingKey(conversationId, userId);
    const timeout = setTimeout(() => {
      this.typingTimeouts.delete(key);
      this.emit({
        type: "chat.typing",
        company_id: companyId,
        conversation_id: conversationId,
        user_id: userId,
        isTyping: false,
        user_ids: userIds,
      });
    }, CHAT_TYPING_TTL_MS);

    this.typingTimeouts.set(key, timeout);
  }

  private async getConversationUserIds(conversationId: string) {
    const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT user_id
      FROM chat_conversation_members
      WHERE conversation_id = ${conversationId}::uuid
        AND removed_at IS NULL`;

    return rows.map((row) => row.user_id as string);
  }

  private async handleMessageInsert(row: Record<string, any>) {
    const userIds = await this.getConversationUserIds(row.conversation_id);
    this.emit({
      type: "chat.message.created",
      company_id: row.company_id,
      conversation_id: row.conversation_id,
      message_id: row.id,
      user_ids: userIds,
    });
  }

  private async handleMessageUpdate(
    nextRow: Record<string, any>,
    previousRow: Record<string, any>,
  ) {
    const userIds = await this.getConversationUserIds(nextRow.conversation_id);

    if (!previousRow.deleted_at && nextRow.deleted_at) {
      this.emit({
        type: "chat.message.deleted",
        company_id: nextRow.company_id,
        conversation_id: nextRow.conversation_id,
        message_id: nextRow.id,
        user_ids: userIds,
      });
      return;
    }

    this.emit({
      type: "chat.message.updated",
      company_id: nextRow.company_id,
      conversation_id: nextRow.conversation_id,
      message_id: nextRow.id,
      user_ids: userIds,
    });
  }

  private async handleConversationUpdate(row: Record<string, any>) {
    const userIds = await this.getConversationUserIds(row.id);
    this.emit({
      type: "chat.conversation.updated",
      company_id: row.company_id,
      conversation_id: row.id,
      user_ids: userIds,
    });
  }

  private async handleMemberInsert(row: Record<string, any>) {
    const userIds = await this.getConversationUserIds(row.conversation_id);
    this.emit({
      type: "chat.member.added",
      company_id: await this.getConversationCompanyId(row.conversation_id),
      conversation_id: row.conversation_id,
      user_id: row.user_id,
      actor_user_id: row.added_by ?? row.user_id,
      user_ids: [...new Set([...userIds, row.user_id])],
    });
  }

  private async handleMemberUpdate(
    nextRow: Record<string, any>,
    previousRow: Record<string, any>,
  ) {
    if (!previousRow.removed_at && nextRow.removed_at) {
      const companyId = await this.getConversationCompanyId(nextRow.conversation_id);
      const userIds = await this.getConversationUserIds(nextRow.conversation_id);
      this.emit({
        type: "chat.member.removed",
        company_id: companyId,
        conversation_id: nextRow.conversation_id,
        user_id: nextRow.user_id,
        actor_user_id: nextRow.removed_by ?? nextRow.user_id,
        user_ids: [...new Set([...userIds, nextRow.user_id])],
      });
      return;
    }

    if (previousRow.notifications_muted !== nextRow.notifications_muted) {
      const companyId = await this.getConversationCompanyId(nextRow.conversation_id);
      const userIds = await this.getConversationUserIds(nextRow.conversation_id);
      this.emit({
        type: "chat.conversation.updated",
        company_id: companyId,
        conversation_id: nextRow.conversation_id,
        user_ids: [...new Set([...userIds, nextRow.user_id])],
      });
    }
  }

  private async getConversationCompanyId(conversationId: string) {
    const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT company_id
      FROM chat_conversations
      WHERE id = ${conversationId}::uuid
      LIMIT 1`;

    return rows[0]?.company_id as string;
  }
}

export const chatRealtimeService = new ChatRealtimeService();
