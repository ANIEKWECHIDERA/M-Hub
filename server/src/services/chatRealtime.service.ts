import { EventEmitter } from "events";
import { createClient } from "@supabase/supabase-js";
import {
  supabaseAdmin,
  supabaseServiceRoleKey,
} from "../config/supabaseClient";
import { prisma } from "../lib/prisma";
import { ChatMessageListItem, ChatRealtimeEvent } from "../types/chat.types";
import { logger } from "../utils/logger";

const CHAT_TYPING_TTL_MS = 4000;

class ChatRealtimeService {
  private emitter = new EventEmitter();
  private typingTimeouts = new Map<string, NodeJS.Timeout>();
  private initialized = false;
  private databaseChannel: ReturnType<typeof supabaseAdmin.channel> | null = null;
  private ephemeralChannel: ReturnType<typeof supabaseAdmin.channel> | null = null;
  private presenceObserverChannels = new Map<
    string,
    ReturnType<typeof supabaseAdmin.channel>
  >();
  private onlineUsersByCompany = new Map<string, Set<string>>();

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

    const payload = {
      company_id: params.companyId,
      conversation_id: params.conversationId,
      user_id: params.userId,
      user_ids: params.userIds,
      isTyping: params.isTyping,
    };

    this.handleTypingPayload({
      ...payload,
    });

    try {
      const result = await this.ephemeralChannel?.send({
        type: "broadcast",
        event: "typing",
        payload,
      });

      if (result !== "ok") {
        logger.warn("chatRealtimeService: typing broadcast fallback", {
          result,
          conversationId: params.conversationId,
          userId: params.userId,
        });
      }
    } catch (error) {
      logger.error("chatRealtimeService: typing broadcast failed", {
        companyId: params.companyId,
        conversationId: params.conversationId,
        userId: params.userId,
        error,
      });
    }
  }

  isOnline(companyId: string, userId: string) {
    return this.onlineUsersByCompany.get(companyId)?.has(userId) ?? false;
  }

  async openPresenceSession(companyId: string, userId: string) {
    this.initialize();
    await this.ensurePresenceObserver(companyId);

    const presenceClient = createClient(
      process.env.SUPABASE_URL!,
      supabaseServiceRoleKey,
    );
    const channel = presenceClient.channel(`chat-presence:${companyId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    await new Promise<void>((resolve, reject) => {
      channel.subscribe(async (status, error) => {
        if (status === "SUBSCRIBED") {
          try {
            await channel.track({
              user_id: userId,
              online_at: new Date().toISOString(),
            });
            resolve();
          } catch (trackError) {
            reject(trackError);
          }
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          reject(error ?? new Error("Failed to subscribe to chat presence"));
        }
      });
    });

    return async () => {
      try {
        await channel.untrack();
      } catch (error) {
        logger.warn("chatRealtimeService: presence untrack failed", {
          companyId,
          userId,
          error,
        });
      }

      try {
        await presenceClient.removeChannel(channel);
      } catch (error) {
        logger.warn("chatRealtimeService: presence channel cleanup failed", {
          companyId,
          userId,
          error,
        });
      }
    };
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

  private async ensurePresenceObserver(companyId: string) {
    if (this.presenceObserverChannels.has(companyId)) {
      return;
    }

    const previousOnline = new Set<string>();
    const channel = supabaseAdmin
      .channel(`chat-presence:${companyId}`)
      .on("presence", { event: "sync" }, () => {
        const state = (channel as any).presenceState?.() as
          | Record<string, Array<Record<string, any>>>
          | undefined;

        const nextOnline = new Set<string>(
          Object.keys(state ?? {}).filter(Boolean),
        );

        this.onlineUsersByCompany.set(companyId, nextOnline);

        for (const userId of nextOnline) {
          if (!previousOnline.has(userId)) {
            this.emit({
              type: "chat.presence",
              company_id: companyId,
              user_id: userId,
              online: true,
            });
          }
        }

        for (const userId of previousOnline) {
          if (!nextOnline.has(userId)) {
            this.emit({
              type: "chat.presence",
              company_id: companyId,
              user_id: userId,
              online: false,
            });
          }
        }

        previousOnline.clear();
        nextOnline.forEach((userId) => previousOnline.add(userId));
      })
      .subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          logger.info("chatRealtimeService: presence observer subscribed", {
            companyId,
          });
          return;
        }

        if (error) {
          logger.error("chatRealtimeService: presence observer error", {
            companyId,
            status,
            error,
          });
        } else {
          logger.warn("chatRealtimeService: presence observer status", {
            companyId,
            status,
          });
        }
      });

    this.presenceObserverChannels.set(companyId, channel);
  }

  private async getConversationUserIds(conversationId: string) {
    const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT user_id
      FROM chat_conversation_members
      WHERE conversation_id = ${conversationId}::uuid
        AND removed_at IS NULL`;

    return rows.map((row) => row.user_id as string);
  }

  private mapMessage(row: Record<string, any>): ChatMessageListItem {
    return {
      id: row.id,
      conversation_id: row.conversation_id,
      company_id: row.company_id,
      sender_team_member_id: row.sender_team_member_id ?? null,
      body: row.body,
      message_type: row.message_type,
      edited_at: row.edited_at ?? null,
      deleted_at: row.deleted_at ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      reply_to_message_id: row.reply_to_message_id ?? null,
      metadata: row.metadata ?? null,
      sender: {
        team_member_id: row.sender_team_member_id ?? null,
        user_id: row.sender_user_id ?? null,
        name: row.sender_name ?? null,
        avatar: row.sender_avatar ?? null,
      },
      tags: Array.isArray(row.tags) ? row.tags : [],
      reply_to: row.reply_to_message ?? null,
      is_edited: Boolean(row.edited_at),
      is_deleted: Boolean(row.deleted_at),
    };
  }

  private async getMessageListItemById(messageId: string) {
    const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT
        m.*,
        tm.user_id AS sender_user_id,
        COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.display_name, tm.email) AS sender_name,
        COALESCE(u.avatar, u.photo_url) AS sender_avatar,
        COALESCE(tags.tags, '[]'::json) AS tags,
        COALESCE(reply.reply_to_message, 'null'::json) AS reply_to_message
      FROM chat_messages m
      LEFT JOIN team_members tm ON tm.id = m.sender_team_member_id
      LEFT JOIN users u ON u.id = tm.user_id
      LEFT JOIN LATERAL (
        SELECT json_agg(t.tag ORDER BY t.tag ASC) AS tags
        FROM chat_message_tags t
        WHERE t.message_id = m.id
      ) tags ON TRUE
      LEFT JOIN LATERAL (
        SELECT json_build_object(
          'id', rm.id,
          'body', rm.body,
          'message_type', rm.message_type,
          'created_at', rm.created_at,
          'edited_at', rm.edited_at,
          'deleted_at', rm.deleted_at,
          'sender_team_member_id', rm.sender_team_member_id,
          'sender_user_id', rtm.user_id,
          'sender_name', COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ru.first_name, ''), ' ', COALESCE(ru.last_name, ''))), ''), ru.display_name, rtm.email),
          'sender_avatar', COALESCE(ru.avatar, ru.photo_url)
        ) AS reply_to_message
        FROM chat_messages rm
        LEFT JOIN team_members rtm ON rtm.id = rm.sender_team_member_id
        LEFT JOIN users ru ON ru.id = rtm.user_id
        WHERE rm.id = m.reply_to_message_id
      ) reply ON TRUE
      WHERE m.id = ${messageId}::uuid
      LIMIT 1`;

    return rows[0] ? this.mapMessage(rows[0]) : null;
  }

  private async handleMessageInsert(row: Record<string, any>) {
    const message = await this.getMessageListItemById(row.id);
    if (!message) {
      return;
    }

    let senderUserId: string | null = null;
    if (row.sender_team_member_id) {
      const senderRows = await prisma.$queryRaw<Array<Record<string, any>>>`
        SELECT user_id
        FROM team_members
        WHERE id = ${row.sender_team_member_id}::uuid
        LIMIT 1`;
      senderUserId = (senderRows[0]?.user_id as string | undefined) ?? null;
    }

    const userIds = await this.getConversationUserIds(row.conversation_id);
    this.emit({
      type: "chat.message.created",
      company_id: row.company_id,
      conversation_id: row.conversation_id,
      message_id: row.id,
      sender_user_id: senderUserId,
      created_at: row.created_at,
      message,
      user_ids: userIds,
    });
  }

  private async handleMessageUpdate(
    nextRow: Record<string, any>,
    previousRow: Record<string, any>,
  ) {
    const userIds = await this.getConversationUserIds(nextRow.conversation_id);
    const message = await this.getMessageListItemById(nextRow.id);
    if (!message) {
      return;
    }

    if (!previousRow.deleted_at && nextRow.deleted_at) {
      this.emit({
        type: "chat.message.deleted",
        company_id: nextRow.company_id,
        conversation_id: nextRow.conversation_id,
        message_id: nextRow.id,
        message,
        user_ids: userIds,
      });
      return;
    }

    this.emit({
      type: "chat.message.updated",
      company_id: nextRow.company_id,
      conversation_id: nextRow.conversation_id,
      message_id: nextRow.id,
      message,
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
