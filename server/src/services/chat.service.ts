import { prisma } from "../lib/prisma";
import {
  CHAT_MESSAGE_TAGS,
  ChatConversationRecord,
  ChatMessageRecord,
  ChatMessageType,
  CreateChatMessageDTO,
  CreateDirectConversationDTO,
  CreateGroupConversationDTO,
} from "../types/chat.types";
import { ChatAuthorizationService } from "./chatAuthorization.service";
import { ChatHttpError } from "./chatErrors";
import { logger } from "../utils/logger";

function mapConversation(row: Record<string, any>): ChatConversationRecord {
  return {
    id: row.id,
    company_id: row.company_id,
    type: row.type,
    direct_key: row.direct_key ?? null,
    name: row.name ?? null,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_message_at: row.last_message_at ?? null,
    archived_at: row.archived_at ?? null,
    metadata: row.metadata ?? null,
  };
}

function mapMessage(row: Record<string, any>): ChatMessageRecord {
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
  };
}

function buildDirectKey(companyId: string, userIds: [string, string]) {
  const [first, second] = [...userIds].sort();
  return `${companyId}:${first}:${second}`;
}

async function getActiveMembersForUsers(companyId: string, userIds: string[]) {
  if (!userIds.length) {
    throw new ChatHttpError(
      400,
      "At least one active workspace member is required",
      "CHAT_PARTICIPANTS_REQUIRED",
    );
  }

  const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
    SELECT id, user_id, company_id, status
    FROM team_members
    WHERE company_id = ${companyId}::uuid
      AND user_id = ANY(${userIds}::uuid[])
      AND status = 'active'`;

  if (rows.length !== userIds.length) {
    throw new ChatHttpError(
      400,
      "All chat participants must be active workspace members",
      "CHAT_INVALID_PARTICIPANTS",
    );
  }

  return rows;
}

async function createSystemMessage(params: {
  conversationId: string;
  companyId: string;
  body: string;
}) {
  await prisma.$executeRaw`
    INSERT INTO chat_messages (
      conversation_id,
      company_id,
      sender_team_member_id,
      body,
      message_type,
      created_at,
      updated_at
    )
    VALUES (
      ${params.conversationId}::uuid,
      ${params.companyId}::uuid,
      NULL,
      ${params.body},
      ${"system"},
      NOW(),
      NOW()
    )`;

  await prisma.$executeRaw`
    UPDATE chat_conversations
    SET last_message_at = NOW(),
        updated_at = NOW()
    WHERE id = ${params.conversationId}::uuid`;
}

export const ChatService = {
  async listConversations(companyId: string, userId: string, limit = 50) {
    const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));
    const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT
        c.*,
        cm.notifications_muted,
        cm.last_read_message_id,
        cm.last_read_at
      FROM chat_conversations c
      INNER JOIN chat_conversation_members cm
        ON cm.conversation_id = c.id
      WHERE c.company_id = ${companyId}::uuid
        AND cm.user_id = ${userId}::uuid
        AND cm.removed_at IS NULL
      ORDER BY COALESCE(c.last_message_at, c.created_at) DESC, c.id DESC
      LIMIT ${safeLimit}`;

    return rows.map(mapConversation);
  },

  async getConversation(conversationId: string, companyId: string, userId: string) {
    const context = await ChatAuthorizationService.assertCanViewConversation({
      conversationId,
      companyId,
      userId,
    });

    const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT *
      FROM chat_conversations
      WHERE id = ${context.id}::uuid
      LIMIT 1`;

    return rows[0] ? mapConversation(rows[0]) : null;
  },

  async listMessages(params: {
    conversationId: string;
    companyId: string;
    userId: string;
    limit?: number;
    cursorMessageId?: string | null;
  }) {
    await ChatAuthorizationService.assertCanViewConversation({
      conversationId: params.conversationId,
      companyId: params.companyId,
      userId: params.userId,
    });

    const limit = Math.min(100, Math.max(1, params.limit ?? 50));

    let cursorCreatedAt: string | null = null;
    if (params.cursorMessageId) {
      const cursorRows = await prisma.$queryRaw<Array<Record<string, any>>>`
        SELECT created_at
        FROM chat_messages
        WHERE id = ${params.cursorMessageId}::uuid
          AND conversation_id = ${params.conversationId}::uuid
        LIMIT 1`;

      cursorCreatedAt = cursorRows[0]?.created_at ?? null;
    }

    const rows = cursorCreatedAt
      ? await prisma.$queryRaw<Array<Record<string, any>>>`
          SELECT *
          FROM chat_messages
          WHERE conversation_id = ${params.conversationId}::uuid
            AND company_id = ${params.companyId}::uuid
            AND (
              created_at < ${cursorCreatedAt}::timestamp
              OR (
                created_at = ${cursorCreatedAt}::timestamp
                AND id < ${params.cursorMessageId}::uuid
              )
            )
          ORDER BY created_at DESC, id DESC
          LIMIT ${limit}`
      : await prisma.$queryRaw<Array<Record<string, any>>>`
          SELECT *
          FROM chat_messages
          WHERE conversation_id = ${params.conversationId}::uuid
            AND company_id = ${params.companyId}::uuid
          ORDER BY created_at DESC, id DESC
          LIMIT ${limit}`;

    return rows.map(mapMessage);
  },

  async createDirectConversation(payload: CreateDirectConversationDTO) {
    const uniqueUserIds = [...new Set(payload.participant_user_ids)];

    if (uniqueUserIds.length !== 2) {
      throw new ChatHttpError(
        400,
        "Direct conversations require exactly two distinct participants",
        "CHAT_DIRECT_PARTICIPANTS_INVALID",
      );
    }

    const members = await getActiveMembersForUsers(payload.company_id, uniqueUserIds);
    const directKey = buildDirectKey(payload.company_id, [
      uniqueUserIds[0],
      uniqueUserIds[1],
    ]);

    const conversation = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<Record<string, any>>>`
        INSERT INTO chat_conversations (
          company_id,
          type,
          direct_key,
          name,
          created_by,
          created_at,
          updated_at
        )
        VALUES (
          ${payload.company_id}::uuid,
          ${"direct"},
          ${directKey},
          NULL,
          ${payload.created_by}::uuid,
          NOW(),
          NOW()
        )
        ON CONFLICT (direct_key)
        DO UPDATE SET updated_at = NOW()
        RETURNING *`;

      const createdConversation = rows[0];

      for (const member of members) {
        await tx.$executeRaw`
          INSERT INTO chat_conversation_members (
            conversation_id,
            user_id,
            team_member_id,
            joined_at,
            added_by
          )
          SELECT
            ${createdConversation.id}::uuid,
            ${member.user_id}::uuid,
            ${member.id}::uuid,
            NOW(),
            ${payload.created_by}::uuid
          WHERE NOT EXISTS (
            SELECT 1
            FROM chat_conversation_members cm
            WHERE cm.conversation_id = ${createdConversation.id}::uuid
              AND cm.user_id = ${member.user_id}::uuid
              AND cm.removed_at IS NULL
          )`;
        await tx.$executeRaw`
          UPDATE chat_conversation_members
          SET removed_at = NULL,
              removed_by = NULL,
              added_by = ${payload.created_by}::uuid
          WHERE conversation_id = ${createdConversation.id}::uuid
            AND user_id = ${member.user_id}::uuid
            AND removed_at IS NOT NULL`;
      }

      return createdConversation;
    });

    return mapConversation(conversation);
  },

  async createGroupConversation(payload: CreateGroupConversationDTO) {
    const uniqueUserIds = [...new Set([payload.created_by, ...payload.participant_user_ids])];

    if (!payload.name.trim()) {
      throw new ChatHttpError(400, "Group name is required", "CHAT_GROUP_NAME_REQUIRED");
    }

    const members = await getActiveMembersForUsers(payload.company_id, uniqueUserIds);

    const conversation = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<Record<string, any>>>`
        INSERT INTO chat_conversations (
          company_id,
          type,
          name,
          created_by,
          created_at,
          updated_at,
          metadata
        )
        VALUES (
          ${payload.company_id}::uuid,
          ${"group"},
          ${payload.name.trim()},
          ${payload.created_by}::uuid,
          NOW(),
          NOW(),
          ${payload.metadata ? JSON.stringify(payload.metadata) : null}::jsonb
        )
        RETURNING *`;

      const createdConversation = rows[0];

      for (const member of members) {
        await tx.$executeRaw`
          INSERT INTO chat_conversation_members (
            conversation_id,
            user_id,
            team_member_id,
            joined_at,
            added_by
          )
          VALUES (
            ${createdConversation.id}::uuid,
            ${member.user_id}::uuid,
            ${member.id}::uuid,
            NOW(),
            ${payload.created_by}::uuid
          )`;
      }

      return createdConversation;
    });

    await createSystemMessage({
      conversationId: conversation.id,
      companyId: payload.company_id,
      body: `Group "${payload.name.trim()}" was created`,
    });

    return mapConversation(conversation);
  },

  async addMembers(params: {
    conversationId: string;
    companyId: string;
    requesterUserId: string;
    requesterAccess?: string | null;
    participantUserIds: string[];
  }) {
    const conversation = await ChatAuthorizationService.assertCanManageGroup({
      conversationId: params.conversationId,
      companyId: params.companyId,
      userId: params.requesterUserId,
      access: params.requesterAccess,
    });

    const uniqueUserIds = [...new Set(params.participantUserIds)].filter(Boolean);
    const members = await getActiveMembersForUsers(params.companyId, uniqueUserIds);

    await prisma.$transaction(async (tx) => {
      for (const member of members) {
        await tx.$executeRaw`
          INSERT INTO chat_conversation_members (
            conversation_id,
            user_id,
            team_member_id,
            joined_at,
            added_by
          )
          SELECT
            ${conversation.id}::uuid,
            ${member.user_id}::uuid,
            ${member.id}::uuid,
            NOW(),
            ${params.requesterUserId}::uuid
          WHERE NOT EXISTS (
            SELECT 1
            FROM chat_conversation_members cm
            WHERE cm.conversation_id = ${conversation.id}::uuid
              AND cm.user_id = ${member.user_id}::uuid
              AND cm.removed_at IS NULL
          )`;
        await tx.$executeRaw`
          UPDATE chat_conversation_members
          SET removed_at = NULL,
              removed_by = NULL,
              added_by = ${params.requesterUserId}::uuid
          WHERE conversation_id = ${conversation.id}::uuid
            AND user_id = ${member.user_id}::uuid
            AND removed_at IS NOT NULL`;
      }
    });

    await createSystemMessage({
      conversationId: conversation.id,
      companyId: params.companyId,
      body: `Members added to ${conversation.name ?? "group chat"}`,
    });

    return { success: true };
  },

  async removeMember(params: {
    conversationId: string;
    companyId: string;
    requesterUserId: string;
    requesterAccess?: string | null;
    targetUserId: string;
  }) {
    const conversation = await ChatAuthorizationService.assertCanManageGroup({
      conversationId: params.conversationId,
      companyId: params.companyId,
      userId: params.requesterUserId,
      access: params.requesterAccess,
    });

    const result = await prisma.$queryRaw<Array<Record<string, any>>>`
      UPDATE chat_conversation_members
      SET removed_at = NOW(),
          removed_by = ${params.requesterUserId}::uuid
      WHERE conversation_id = ${conversation.id}::uuid
        AND user_id = ${params.targetUserId}::uuid
        AND removed_at IS NULL
      RETURNING id`;

    if (!result[0]) {
      throw new ChatHttpError(404, "Conversation member not found", "CHAT_MEMBER_NOT_FOUND");
    }

    await createSystemMessage({
      conversationId: conversation.id,
      companyId: params.companyId,
      body: `A member was removed from ${conversation.name ?? "group chat"}`,
    });

    return { success: true };
  },

  async renameGroup(params: {
    conversationId: string;
    companyId: string;
    requesterUserId: string;
    requesterAccess?: string | null;
    name: string;
  }) {
    const conversation = await ChatAuthorizationService.assertCanManageGroup({
      conversationId: params.conversationId,
      companyId: params.companyId,
      userId: params.requesterUserId,
      access: params.requesterAccess,
    });

    const name = params.name.trim();
    if (!name) {
      throw new ChatHttpError(400, "Group name is required", "CHAT_GROUP_NAME_REQUIRED");
    }

    await prisma.$executeRaw`
      UPDATE chat_conversations
      SET name = ${name},
          updated_at = NOW()
      WHERE id = ${conversation.id}::uuid`;

    await createSystemMessage({
      conversationId: conversation.id,
      companyId: params.companyId,
      body: `Group renamed to "${name}"`,
    });

    return { success: true };
  },

  async sendMessage(
    params: CreateChatMessageDTO & {
      requesterUserId: string;
      requesterAccess?: string | null;
    },
  ) {
    await ChatAuthorizationService.assertCanSendMessages({
      conversationId: params.conversation_id,
      companyId: params.company_id,
      userId: params.requesterUserId,
    });

    const messageType = (params.message_type ?? "text") as ChatMessageType;
    const body = params.body.trim();

    if (!body) {
      throw new ChatHttpError(400, "Message body is required", "CHAT_MESSAGE_BODY_REQUIRED");
    }

    if (messageType === "system") {
      throw new ChatHttpError(
        403,
        "System messages can only be created by the server",
        "CHAT_SYSTEM_MESSAGE_FORBIDDEN",
      );
    }

    const uniqueTags = params.tags?.length
      ? [...new Set(params.tags.map((tag) => tag.trim()).filter(Boolean))]
      : [];

    const invalidTags = uniqueTags.filter(
      (tag) => !CHAT_MESSAGE_TAGS.includes(tag as (typeof CHAT_MESSAGE_TAGS)[number]),
    );

    if (invalidTags.length) {
      throw new ChatHttpError(
        400,
        "One or more message tags are invalid",
        "CHAT_INVALID_TAGS",
      );
    }

    if (uniqueTags.includes("announcement")) {
      ChatAuthorizationService.assertCanModerateWorkspace(params.requesterAccess);
    }

    const rows = await prisma.$transaction(async (tx) => {
      const inserted = await tx.$queryRaw<Array<Record<string, any>>>`
        INSERT INTO chat_messages (
          conversation_id,
          company_id,
          sender_team_member_id,
          body,
          message_type,
          reply_to_message_id,
          metadata,
          created_at,
          updated_at
        )
        VALUES (
          ${params.conversation_id}::uuid,
          ${params.company_id}::uuid,
          ${params.sender_team_member_id}::uuid,
          ${body},
          ${messageType},
          ${params.reply_to_message_id ?? null}::uuid,
          ${params.metadata ? JSON.stringify(params.metadata) : null}::jsonb,
          NOW(),
          NOW()
        )
        RETURNING *`;

      await tx.$executeRaw`
        UPDATE chat_conversations
        SET last_message_at = NOW(),
            updated_at = NOW()
        WHERE id = ${params.conversation_id}::uuid`;

      if (uniqueTags.length) {
        for (const tag of uniqueTags) {
          await tx.$executeRaw`
            INSERT INTO chat_message_tags (
              message_id,
              tag,
              created_at,
              created_by
            )
            VALUES (
              ${inserted[0].id}::uuid,
              ${tag},
              NOW(),
              ${params.requesterUserId}::uuid
            )
            ON CONFLICT (message_id, tag) DO NOTHING`;
        }
      }

      return inserted;
    });

    return mapMessage(rows[0]);
  },

  async editMessage(params: {
    messageId: string;
    companyId: string;
    requesterUserId: string;
    requesterTeamMemberId?: string | null;
    body: string;
  }) {
    const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT
        m.*,
        c.company_id AS conversation_company_id,
        EXISTS (
          SELECT 1
          FROM chat_conversation_members cm
          WHERE cm.conversation_id = m.conversation_id
            AND cm.user_id = ${params.requesterUserId}::uuid
            AND cm.removed_at IS NULL
        ) AS requester_is_member
      FROM chat_messages m
      INNER JOIN chat_conversations c ON c.id = m.conversation_id
      WHERE m.id = ${params.messageId}::uuid
        AND c.company_id = ${params.companyId}::uuid
      LIMIT 1`;

    const message = rows[0];
    if (!message) {
      throw new ChatHttpError(404, "Message not found", "CHAT_MESSAGE_NOT_FOUND");
    }

    if (!message.requester_is_member) {
      throw new ChatHttpError(403, "You do not have access to this conversation", "CHAT_ACCESS_DENIED");
    }

    if (message.sender_team_member_id !== params.requesterTeamMemberId) {
      throw new ChatHttpError(403, "You can only edit your own messages", "CHAT_EDIT_FORBIDDEN");
    }

    if (message.message_type === "system") {
      throw new ChatHttpError(403, "System messages cannot be edited", "CHAT_SYSTEM_EDIT_FORBIDDEN");
    }

    const body = params.body.trim();
    if (!body) {
      throw new ChatHttpError(400, "Message body is required", "CHAT_MESSAGE_BODY_REQUIRED");
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO chat_message_edits (
          message_id,
          previous_body,
          edited_by,
          edited_at
        )
        VALUES (
          ${params.messageId}::uuid,
          ${message.body},
          ${params.requesterUserId}::uuid,
          NOW()
        )`;

      const updateRows = await tx.$queryRaw<Array<Record<string, any>>>`
        UPDATE chat_messages
        SET body = ${body},
            edited_at = NOW(),
            updated_at = NOW()
        WHERE id = ${params.messageId}::uuid
        RETURNING *`;

      return updateRows[0];
    });

    return mapMessage(updated);
  },
};
