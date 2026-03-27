import { EventEmitter } from "events";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../config/supabaseClient";
import { prisma } from "../lib/prisma";
import { ChatRealtimeEvent } from "../types/chat.types";
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
      process.env.SUPABASE_KEY!,
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

  private async handleMessageInsert(row: Record<string, any>) {
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
