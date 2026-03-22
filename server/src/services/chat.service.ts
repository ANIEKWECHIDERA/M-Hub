import { prisma } from "../lib/prisma";
import { logger } from "../utils/logger";
import {
  CHAT_MESSAGE_TAGS,
  ChatConversationDetails,
  ChatConversationListItem,
  ChatConversationMemberSummary,
  ChatConversationPermissions,
  ChatConversationRecord,
  ChatMessageListItem,
  ChatMessageRecord,
  ChatMessageSummary,
  ChatMessageTag,
  ChatMessageType,
  CreateChatMessageDTO,
  CreateDirectConversationDTO,
  CreateGroupConversationDTO,
  UpdateChatMessageTagsDTO,
} from "../types/chat.types";
import { ChatAuthorizationService } from "./chatAuthorization.service";
import { ChatHttpError } from "./chatErrors";
import { chatRealtimeService } from "./chatRealtime.service";
import { RequestCacheService } from "./requestCache.service";

type ActiveMemberRow = {
  id: string;
  user_id: string;
  company_id: string;
  status: string;
  role: string | null;
  access: string | null;
  email: string;
  name: string | null;
  avatar: string | null;
};

type EnsureGeneralConversationResult = {
  conversationId: string;
  created: boolean;
};

const CHAT_MESSAGE_EDIT_WINDOW_MINUTES = 15;
const READ_CURSOR_LOG_SAMPLE_INTERVAL = 10;
const TYPING_LOG_SAMPLE_INTERVAL = 20;
let readCursorEventCount = 0;
let typingEventCount = 0;

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

function shouldSampleChatLog(count: number, interval: number) {
  return count <= 5 || count % interval === 0;
}

function normalizeIsoTimestamp(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ChatHttpError(
      400,
      "Invalid timestamp supplied",
      "CHAT_INVALID_TIMESTAMP",
    );
  }

  return date.toISOString();
}

function clampLimit(limit: number | undefined, fallback = 50) {
  return Math.min(100, Math.max(1, Math.trunc(limit ?? fallback)));
}

function normalizeMessageTags(tags?: string[]) {
  const uniqueTags = tags?.length
    ? [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]
    : [];
  const invalidTags = uniqueTags.filter(
    (tag) => !CHAT_MESSAGE_TAGS.includes(tag as ChatMessageTag),
  );

  if (invalidTags.length) {
    throw new ChatHttpError(
      400,
      "One or more message tags are invalid",
      "CHAT_INVALID_TAGS",
    );
  }

  return uniqueTags;
}

function parseJsonArray<T>(value: unknown): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapMemberSummary(row: Record<string, any>): ChatConversationMemberSummary {
  return {
    id: row.id,
    user_id: row.user_id,
    team_member_id: row.team_member_id,
    name: row.name ?? row.email ?? "Unknown member",
    email: row.email,
    avatar: row.avatar ?? null,
    online: chatRealtimeService.isOnline(row.company_id, row.user_id),
    role: row.role ?? null,
    access: row.access ?? null,
    joined_at: row.joined_at,
    notifications_muted: Boolean(row.notifications_muted),
  };
}

function mapMessageSummary(row: Record<string, any> | null | undefined): ChatMessageSummary | null {
  if (!row?.id) return null;
  return {
    id: row.id,
    body: row.body,
    message_type: row.message_type,
    created_at: row.created_at,
    edited_at: row.edited_at ?? null,
    deleted_at: row.deleted_at ?? null,
    sender: {
      team_member_id: row.sender_team_member_id ?? null,
      user_id: row.sender_user_id ?? null,
      name: row.sender_name ?? null,
      avatar: row.sender_avatar ?? null,
    },
  };
}

function mapMessageListItem(row: Record<string, any>): ChatMessageListItem {
  return {
    ...mapMessage(row),
    sender: {
      team_member_id: row.sender_team_member_id ?? null,
      user_id: row.sender_user_id ?? null,
      name: row.sender_name ?? null,
      avatar: row.sender_avatar ?? null,
    },
    tags: parseJsonArray<string>(row.tags),
    reply_to: mapMessageSummary(row.reply_to_message ?? null),
    is_edited: Boolean(row.edited_at),
    is_deleted: Boolean(row.deleted_at),
  };
}

function buildPermissions(params: {
  type: "direct" | "group";
  archivedAt: string | null;
  access?: string | null;
  metadata?: Record<string, unknown> | null;
}): ChatConversationPermissions {
  const canModerate = params.access === "admin" || params.access === "superAdmin";
  const isSystemGeneralGroup =
    params.metadata &&
    typeof params.metadata === "object" &&
    (params.metadata as Record<string, unknown>).kind === "general";
  const canManageGroup =
    params.type === "group" && canModerate && !isSystemGeneralGroup;
  return {
    can_view: true,
    can_send_messages: !params.archivedAt,
    can_rename_group: canManageGroup,
    can_manage_members: canManageGroup,
    can_moderate_messages: canModerate,
    can_delete_conversation:
      params.type === "direct" ? !params.archivedAt : canManageGroup,
  };
}

async function resolveActiveMembersForScope(params: {
  companyId: string;
  userIds?: string[];
  teamMemberIds?: string[];
}) {
  const userIds = [...new Set((params.userIds ?? []).filter(Boolean))];
  const teamMemberIds = [...new Set((params.teamMemberIds ?? []).filter(Boolean))];

  if (!userIds.length && !teamMemberIds.length) {
    throw new ChatHttpError(400, "At least one active workspace member is required", "CHAT_PARTICIPANTS_REQUIRED");
  }

  const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
    SELECT
      tm.id,
      tm.user_id,
      tm.company_id,
      tm.status,
      tm.role,
      tm.access,
      tm.email,
      COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.display_name, tm.email) AS name,
      COALESCE(u.avatar, u.photo_url) AS avatar
    FROM team_members tm
    LEFT JOIN users u ON u.id = tm.user_id
    WHERE tm.company_id = ${params.companyId}::uuid
      AND tm.status = 'active'
      AND tm.user_id IS NOT NULL
      AND (
        (cardinality(${userIds}::uuid[]) > 0 AND tm.user_id = ANY(${userIds}::uuid[]))
        OR (cardinality(${teamMemberIds}::uuid[]) > 0 AND tm.id = ANY(${teamMemberIds}::uuid[]))
      )`;

  const byUserId = new Map<string, ActiveMemberRow>();
  const byTeamMemberId = new Map<string, ActiveMemberRow>();
  for (const row of rows) {
    byUserId.set(row.user_id, row as ActiveMemberRow);
    byTeamMemberId.set(row.id, row as ActiveMemberRow);
  }

  const resolved = new Map<string, ActiveMemberRow>();
  for (const userId of userIds) {
    const member = byUserId.get(userId);
    if (!member) {
      throw new ChatHttpError(400, "All chat participants must be active workspace members", "CHAT_INVALID_PARTICIPANTS");
    }
    resolved.set(member.user_id, member);
  }
  for (const teamMemberId of teamMemberIds) {
    const member = byTeamMemberId.get(teamMemberId);
    if (!member) {
      throw new ChatHttpError(400, "All chat participants must be active workspace members", "CHAT_INVALID_PARTICIPANTS");
    }
    resolved.set(member.user_id, member);
  }

  return [...resolved.values()];
}

async function getAllActiveWorkspaceMembers(companyId: string) {
  const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
    SELECT
      tm.id,
      tm.user_id,
      tm.company_id,
      tm.status,
      tm.role,
      tm.access,
      tm.email,
      COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.display_name, tm.email) AS name,
      COALESCE(u.avatar, u.photo_url) AS avatar
    FROM team_members tm
    LEFT JOIN users u ON u.id = tm.user_id
    WHERE tm.company_id = ${companyId}::uuid
      AND tm.status = 'active'
      AND tm.user_id IS NOT NULL`;

  return rows as ActiveMemberRow[];
}

async function insertGeneralSystemMessage(params: {
  conversationId: string;
  companyId: string;
}) {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw<Array<Record<string, any>>>`
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
        ${"General chat created"},
        ${"system"},
        NOW(),
        NOW()
      )
      RETURNING id`;

    await tx.$executeRaw`
      UPDATE chat_conversations
      SET last_message_at = NOW(),
          updated_at = NOW()
      WHERE id = ${params.conversationId}::uuid`;
  });
}

async function ensureGeneralConversation(companyId: string): Promise<EnsureGeneralConversationResult | null> {
  const activeMembers = await getAllActiveWorkspaceMembers(companyId);

  if (!activeMembers.length) {
    return null;
  }

  const result = await prisma.$transaction(async (tx) => {
    const existingRows = await tx.$queryRaw<Array<Record<string, any>>>`
      SELECT id
      FROM chat_conversations
      WHERE company_id = ${companyId}::uuid
        AND type = ${"group"}
        AND archived_at IS NULL
        AND (
          COALESCE(metadata->>'kind', '') = ${"general"}
          OR LOWER(COALESCE(name, '')) = LOWER(${ "General" })
        )
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE`;

    let conversationId = existingRows[0]?.id as string | undefined;
    let created = false;

    if (!conversationId) {
      const creatorUserId = activeMembers[0]?.user_id;
      const createdRows = await tx.$queryRaw<Array<Record<string, any>>>`
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
          ${companyId}::uuid,
          ${"group"},
          ${"General"},
          ${creatorUserId}::uuid,
          NOW(),
          NOW(),
          ${JSON.stringify({ kind: "general" })}::jsonb
        )
        RETURNING id`;

      conversationId = createdRows[0]?.id;
      created = true;
    } else {
      await tx.$executeRaw`
        UPDATE chat_conversations
        SET name = ${"General"},
            metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
              kind: "general",
            })}::jsonb,
            updated_at = NOW()
        WHERE id = ${conversationId}::uuid`;
    }

    if (!conversationId) {
      throw new ChatHttpError(
        500,
        "Failed to ensure General conversation",
        "CHAT_GENERAL_CONVERSATION_FAILED",
      );
    }

    for (const member of activeMembers) {
      await tx.$executeRaw`
        INSERT INTO chat_conversation_members (
          conversation_id,
          user_id,
          team_member_id,
          joined_at,
          added_by
        )
        SELECT
          ${conversationId}::uuid,
          ${member.user_id}::uuid,
          ${member.id}::uuid,
          NOW(),
          ${member.user_id}::uuid
        WHERE NOT EXISTS (
          SELECT 1
          FROM chat_conversation_members cm
          WHERE cm.conversation_id = ${conversationId}::uuid
            AND cm.user_id = ${member.user_id}::uuid
            AND cm.removed_at IS NULL
        )`;

      await tx.$executeRaw`
        UPDATE chat_conversation_members
        SET removed_at = NULL,
            removed_by = NULL,
            team_member_id = ${member.id}::uuid
        WHERE conversation_id = ${conversationId}::uuid
          AND user_id = ${member.user_id}::uuid
          AND removed_at IS NOT NULL`;
    }

    return { conversationId, created };
  });

  if (result.created) {
    await insertGeneralSystemMessage({
      conversationId: result.conversationId,
      companyId,
    });
    logger.info("ChatService.ensureGeneralConversation: created default General chat", {
      companyId,
      conversationId: result.conversationId,
      memberCount: activeMembers.length,
    });
  }

  return result;
}

async function getConversationMemberUserIds(conversationId: string) {
  const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
    SELECT user_id
    FROM chat_conversation_members
    WHERE conversation_id = ${conversationId}::uuid
      AND removed_at IS NULL`;

  return rows.map((row) => row.user_id as string);
}

async function emitConversationEvent(
  event:
    | {
        type: "chat.conversation.created" | "chat.conversation.updated";
        company_id: string;
        conversation_id: string;
      }
    | {
        type: "chat.message.created" | "chat.message.updated" | "chat.message.deleted";
        company_id: string;
        conversation_id: string;
        message_id: string;
      }
    | {
        type: "chat.member.added" | "chat.member.removed";
        company_id: string;
        conversation_id: string;
        user_id: string;
        actor_user_id: string;
      },
) {
  const userIds = await getConversationMemberUserIds(event.conversation_id);
  chatRealtimeService.emit({
    ...event,
    user_ids:
      "user_id" in event
        ? [...new Set([...userIds, event.user_id])]
        : userIds,
  } as any);
}

async function createSystemMessage(params: {
  conversationId: string;
  companyId: string;
  body: string;
}) {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw<Array<Record<string, any>>>`
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
      )
      RETURNING *`;

    await tx.$executeRaw`
      UPDATE chat_conversations
      SET last_message_at = NOW(),
          updated_at = NOW()
      WHERE id = ${params.conversationId}::uuid`;
  });
}

async function getConversationMemberSummaries(conversationId: string) {
  const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
    SELECT
      cm.id,
      tm.company_id,
      cm.user_id,
      cm.team_member_id,
      cm.joined_at,
      cm.notifications_muted,
      tm.role,
      tm.access,
      tm.email,
      COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.display_name, tm.email) AS name,
      COALESCE(u.avatar, u.photo_url) AS avatar
    FROM chat_conversation_members cm
    INNER JOIN team_members tm ON tm.id = cm.team_member_id
    LEFT JOIN users u ON u.id = cm.user_id
    WHERE cm.conversation_id = ${conversationId}::uuid
      AND cm.removed_at IS NULL
    ORDER BY cm.joined_at ASC`;

  return rows.map(mapMemberSummary);
}

async function getLastMessageSummary(conversationId: string) {
  const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
    SELECT
      m.id,
      m.body,
      m.message_type,
      m.created_at,
      m.edited_at,
      m.sender_team_member_id,
      tm.user_id AS sender_user_id,
      COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.display_name, tm.email) AS sender_name,
      COALESCE(u.avatar, u.photo_url) AS sender_avatar
    FROM chat_messages m
    LEFT JOIN team_members tm ON tm.id = m.sender_team_member_id
    LEFT JOIN users u ON u.id = tm.user_id
    WHERE m.conversation_id = ${conversationId}::uuid
      AND m.deleted_at IS NULL
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT 1`;

  return mapMessageSummary(rows[0]);
}

async function getMessageListItemById(messageId: string) {
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

  return rows[0] ? mapMessageListItem(rows[0]) : null;
}

async function getMessageTagContext(params: {
  messageId: string;
  companyId: string;
  requesterUserId: string;
}) {
  const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
    SELECT
      m.id,
      m.conversation_id,
      m.message_type,
      m.deleted_at,
      c.type AS conversation_type,
      c.archived_at,
      EXISTS (
        SELECT 1
        FROM chat_conversation_members cm
        WHERE cm.conversation_id = m.conversation_id
          AND cm.user_id = ${params.requesterUserId}::uuid
          AND cm.removed_at IS NULL
      ) AS requester_is_member,
      COALESCE(tags.tags, '[]'::json) AS tags
    FROM chat_messages m
    INNER JOIN chat_conversations c ON c.id = m.conversation_id
    LEFT JOIN LATERAL (
      SELECT json_agg(t.tag ORDER BY t.tag ASC) AS tags
      FROM chat_message_tags t
      WHERE t.message_id = m.id
    ) tags ON TRUE
    WHERE m.id = ${params.messageId}::uuid
      AND c.company_id = ${params.companyId}::uuid
      AND c.archived_at IS NULL
    LIMIT 1`;

  const row = rows[0];
  if (!row) {
    throw new ChatHttpError(404, "Message not found", "CHAT_MESSAGE_NOT_FOUND");
  }
  if (!row.requester_is_member) {
    throw new ChatHttpError(
      403,
      "You do not have access to this conversation",
      "CHAT_ACCESS_DENIED",
    );
  }
  if (row.conversation_type !== "group") {
    throw new ChatHttpError(
      400,
      "Message tagging is only available in group chats",
      "CHAT_GROUP_TAGGING_ONLY",
    );
  }
  if (row.deleted_at) {
    throw new ChatHttpError(
      400,
      "Deleted messages cannot be tagged",
      "CHAT_TAG_DELETED_MESSAGE_FORBIDDEN",
    );
  }
  if (row.message_type === "system") {
    throw new ChatHttpError(
      400,
      "System messages cannot be tagged",
      "CHAT_TAG_SYSTEM_MESSAGE_FORBIDDEN",
    );
  }

  return {
    ...row,
    tags: parseJsonArray<string>(row.tags),
  };
}

function mapConversationListItem(row: Record<string, any>): ChatConversationListItem {
  return {
    ...mapConversation(row),
    notifications_muted: Boolean(row.notifications_muted),
    last_read_message_id: row.last_read_message_id ?? null,
    last_read_at: row.last_read_at ?? null,
    unread_count: Number(row.unread_count ?? 0),
    member_count: Number(row.member_count ?? 0),
    last_message: mapMessageSummary(row.last_message ?? null),
    members: parseJsonArray<Record<string, any>>(row.members).map(mapMemberSummary),
  };
}

export const ChatService = {
  ensureGeneralConversation,

  async deactivateCompanyMembershipChats(params: {
    companyId: string;
    userId?: string | null;
  }) {
    if (!params.userId) {
      return;
    }

    await prisma.$executeRaw`
      UPDATE chat_conversation_members cm
      SET removed_at = NOW(),
          removed_by = ${params.userId}::uuid
      FROM chat_conversations c
      WHERE cm.conversation_id = c.id
        AND c.company_id = ${params.companyId}::uuid
        AND cm.user_id = ${params.userId}::uuid
        AND cm.removed_at IS NULL`;

    logger.info("ChatService.deactivateCompanyMembershipChats: removed user from workspace chats", {
      companyId: params.companyId,
      userId: params.userId,
    });

    RequestCacheService.invalidateChatMembershipForUser(params.userId, {
      reason: "chat_membership_changed",
    });
  },

  async resolveDirectTargetUser(companyId: string, teamMemberId: string) {
    const members = await resolveActiveMembersForScope({
      companyId,
      teamMemberIds: [teamMemberId],
    });

    return members[0]?.user_id ?? null;
  },

  async resolveParticipantUserIds(params: {
    companyId: string;
    participantUserIds?: string[];
    participantTeamMemberIds?: string[];
  }) {
    const members = await resolveActiveMembersForScope({
      companyId: params.companyId,
      userIds: params.participantUserIds,
      teamMemberIds: params.participantTeamMemberIds,
    });

    return members.map((member) => member.user_id);
  },

  async listConversations(params: {
    companyId: string;
    userId: string;
    limit?: number;
    cursorConversationId?: string | null;
    requestPath?: string;
  }) {
    await ensureGeneralConversation(params.companyId);

    const safeLimit = clampLimit(params.limit);
    let cursorSortTs: string | null = null;

    if (params.cursorConversationId) {
      const cursorRows = await prisma.$queryRaw<Array<Record<string, any>>>`
        SELECT COALESCE(last_message_at, created_at) AS sort_ts
        FROM chat_conversations
        WHERE id = ${params.cursorConversationId}::uuid
          AND company_id = ${params.companyId}::uuid
        LIMIT 1`;

      cursorSortTs = cursorRows[0]?.sort_ts ?? null;
    }

    const rows = cursorSortTs
      ? await prisma.$queryRaw<Array<Record<string, any>>>`
          WITH base_conversations AS (
            SELECT
              c.*,
              cm.notifications_muted,
              cm.last_read_message_id,
              cm.last_read_at,
              cm.team_member_id
            FROM chat_conversations c
            INNER JOIN chat_conversation_members cm
              ON cm.conversation_id = c.id
             AND cm.user_id = ${params.userId}::uuid
             AND cm.removed_at IS NULL
            WHERE c.company_id = ${params.companyId}::uuid
              AND c.archived_at IS NULL
              AND (
                COALESCE(c.last_message_at, c.created_at) < ${cursorSortTs}::timestamp
                OR (
                  COALESCE(c.last_message_at, c.created_at) = ${cursorSortTs}::timestamp
                  AND c.id < ${params.cursorConversationId}::uuid
                )
              )
            ORDER BY COALESCE(c.last_message_at, c.created_at) DESC, c.id DESC
            LIMIT ${safeLimit}
          )
          SELECT
            bc.*,
            COALESCE(unread.unread_count, 0) AS unread_count,
            COALESCE(member_data.member_count, 0) AS member_count,
            COALESCE(last_message.last_message, 'null'::json) AS last_message,
            COALESCE(member_data.members, '[]'::json) AS members
          FROM base_conversations bc
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS unread_count
            FROM chat_messages m
            WHERE m.conversation_id = bc.id
              AND m.deleted_at IS NULL
              AND (bc.last_read_at IS NULL OR m.created_at > bc.last_read_at)
              AND (m.sender_team_member_id IS NULL OR m.sender_team_member_id <> bc.team_member_id)
          ) unread ON TRUE
          LEFT JOIN LATERAL (
            SELECT json_build_object(
              'id', m.id,
              'body', m.body,
              'message_type', m.message_type,
              'created_at', m.created_at,
              'edited_at', m.edited_at,
              'sender_team_member_id', m.sender_team_member_id,
              'sender_user_id', tm.user_id,
              'sender_name', COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.display_name, tm.email),
              'sender_avatar', COALESCE(u.avatar, u.photo_url)
            ) AS last_message
            FROM chat_messages m
            LEFT JOIN team_members tm ON tm.id = m.sender_team_member_id
            LEFT JOIN users u ON u.id = tm.user_id
            WHERE m.conversation_id = bc.id
              AND m.deleted_at IS NULL
            ORDER BY m.created_at DESC, m.id DESC
            LIMIT 1
          ) last_message ON TRUE
          LEFT JOIN LATERAL (
            SELECT
              COUNT(*)::int AS member_count,
              json_agg(
                json_build_object(
                  'id', cm_active.id,
                  'company_id', tm.company_id,
                  'user_id', cm_active.user_id,
                  'team_member_id', cm_active.team_member_id,
                  'joined_at', cm_active.joined_at,
                  'notifications_muted', cm_active.notifications_muted,
                  'role', tm.role,
                  'access', tm.access,
                  'email', tm.email,
                  'name', COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.display_name, tm.email),
                  'avatar', COALESCE(u.avatar, u.photo_url)
                )
                ORDER BY cm_active.joined_at ASC
              ) AS members
            FROM chat_conversation_members cm_active
            INNER JOIN team_members tm ON tm.id = cm_active.team_member_id
            LEFT JOIN users u ON u.id = cm_active.user_id
            WHERE cm_active.conversation_id = bc.id
              AND cm_active.removed_at IS NULL
          ) member_data ON TRUE
          ORDER BY COALESCE(bc.last_message_at, bc.created_at) DESC, bc.id DESC`
      : await prisma.$queryRaw<Array<Record<string, any>>>`
          WITH base_conversations AS (
            SELECT
              c.*,
              cm.notifications_muted,
              cm.last_read_message_id,
              cm.last_read_at,
              cm.team_member_id
            FROM chat_conversations c
            INNER JOIN chat_conversation_members cm
              ON cm.conversation_id = c.id
             AND cm.user_id = ${params.userId}::uuid
             AND cm.removed_at IS NULL
            WHERE c.company_id = ${params.companyId}::uuid
              AND c.archived_at IS NULL
            ORDER BY COALESCE(c.last_message_at, c.created_at) DESC, c.id DESC
            LIMIT ${safeLimit}
          )
          SELECT
            bc.*,
            COALESCE(unread.unread_count, 0) AS unread_count,
            COALESCE(member_data.member_count, 0) AS member_count,
            COALESCE(last_message.last_message, 'null'::json) AS last_message,
            COALESCE(member_data.members, '[]'::json) AS members
          FROM base_conversations bc
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS unread_count
            FROM chat_messages m
            WHERE m.conversation_id = bc.id
              AND m.deleted_at IS NULL
              AND (bc.last_read_at IS NULL OR m.created_at > bc.last_read_at)
              AND (m.sender_team_member_id IS NULL OR m.sender_team_member_id <> bc.team_member_id)
          ) unread ON TRUE
          LEFT JOIN LATERAL (
            SELECT json_build_object(
              'id', m.id,
              'body', m.body,
              'message_type', m.message_type,
              'created_at', m.created_at,
              'edited_at', m.edited_at,
              'sender_team_member_id', m.sender_team_member_id,
              'sender_user_id', tm.user_id,
              'sender_name', COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.display_name, tm.email),
              'sender_avatar', COALESCE(u.avatar, u.photo_url)
            ) AS last_message
            FROM chat_messages m
            LEFT JOIN team_members tm ON tm.id = m.sender_team_member_id
            LEFT JOIN users u ON u.id = tm.user_id
            WHERE m.conversation_id = bc.id
              AND m.deleted_at IS NULL
            ORDER BY m.created_at DESC, m.id DESC
            LIMIT 1
          ) last_message ON TRUE
          LEFT JOIN LATERAL (
            SELECT
              COUNT(*)::int AS member_count,
              json_agg(
                json_build_object(
                  'id', cm_active.id,
                  'company_id', tm.company_id,
                  'user_id', cm_active.user_id,
                  'team_member_id', cm_active.team_member_id,
                  'joined_at', cm_active.joined_at,
                  'notifications_muted', cm_active.notifications_muted,
                  'role', tm.role,
                  'access', tm.access,
                  'email', tm.email,
                  'name', COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.display_name, tm.email),
                  'avatar', COALESCE(u.avatar, u.photo_url)
                )
                ORDER BY cm_active.joined_at ASC
              ) AS members
            FROM chat_conversation_members cm_active
            INNER JOIN team_members tm ON tm.id = cm_active.team_member_id
            LEFT JOIN users u ON u.id = cm_active.user_id
            WHERE cm_active.conversation_id = bc.id
              AND cm_active.removed_at IS NULL
          ) member_data ON TRUE
          ORDER BY COALESCE(bc.last_message_at, bc.created_at) DESC, bc.id DESC`;

    return rows.map(mapConversationListItem);
  },

  async getConversationDetails(params: {
    conversationId: string;
    companyId: string;
    userId: string;
    access?: string | null;
  }): Promise<ChatConversationDetails | null> {
    const context = await ChatAuthorizationService.assertCanViewConversation({
      conversationId: params.conversationId,
      companyId: params.companyId,
      userId: params.userId,
    });

    const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT *
      FROM chat_conversations
      WHERE id = ${context.id}::uuid
      LIMIT 1`;

    const conversation = rows[0] ? mapConversation(rows[0]) : null;
    if (!conversation) return null;

    const [members, lastMessage] = await Promise.all([
      getConversationMemberSummaries(conversation.id),
      getLastMessageSummary(conversation.id),
    ]);

    return {
      ...conversation,
      member_count: members.length,
      members,
      permissions: buildPermissions({
        type: conversation.type,
        archivedAt: conversation.archived_at,
        access: params.access,
        metadata: conversation.metadata,
      }),
      last_message: lastMessage,
    };
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

    const limit = clampLimit(params.limit);
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
          WHERE m.conversation_id = ${params.conversationId}::uuid
            AND m.company_id = ${params.companyId}::uuid
            AND (
              m.created_at < ${cursorCreatedAt}::timestamp
              OR (
                m.created_at = ${cursorCreatedAt}::timestamp
                AND m.id < ${params.cursorMessageId}::uuid
              )
            )
          ORDER BY m.created_at DESC, m.id DESC
          LIMIT ${limit}`
      : await prisma.$queryRaw<Array<Record<string, any>>>`
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
          WHERE m.conversation_id = ${params.conversationId}::uuid
            AND m.company_id = ${params.companyId}::uuid
          ORDER BY m.created_at DESC, m.id DESC
          LIMIT ${limit}`;

    return rows.map(mapMessageListItem);
  },

  async listTaggedMessages(params: {
    conversationId: string;
    companyId: string;
    userId: string;
    limit?: number;
    tag?: string | null;
    requestPath?: string;
  }) {
    const context = await ChatAuthorizationService.assertCanViewConversation({
      conversationId: params.conversationId,
      companyId: params.companyId,
      userId: params.userId,
      requestPath: params.requestPath,
    });

    if (context.type !== "group") {
      throw new ChatHttpError(
        400,
        "Tagged summaries are only available in group chats",
        "CHAT_GROUP_TAGGING_ONLY",
      );
    }

    const limit = clampLimit(params.limit, 50);
    const filterTag = params.tag?.trim() || null;
    if (
      filterTag &&
      !CHAT_MESSAGE_TAGS.includes(filterTag as ChatMessageTag)
    ) {
      throw new ChatHttpError(
        400,
        "One or more message tags are invalid",
        "CHAT_INVALID_TAGS",
      );
    }

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
      WHERE m.conversation_id = ${params.conversationId}::uuid
        AND m.deleted_at IS NULL
        AND EXISTS (
          SELECT 1
          FROM chat_message_tags filtered_tags
          WHERE filtered_tags.message_id = m.id
            AND (${filterTag}::text IS NULL OR filtered_tags.tag = ${filterTag})
        )
      ORDER BY
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM chat_message_tags decision_tags
            WHERE decision_tags.message_id = m.id
              AND decision_tags.tag = ${"decision"}
          ) THEN 0
          ELSE 1
        END,
        m.created_at DESC,
        m.id DESC
      LIMIT ${limit}`;

    return rows.map(mapMessageListItem);
  },
  async createDirectConversation(payload: CreateDirectConversationDTO) {
    const uniqueUserIds = [...new Set(payload.participant_user_ids)];

    if (uniqueUserIds.length !== 2) {
      throw new ChatHttpError(400, "Direct conversations require exactly two distinct participants", "CHAT_DIRECT_PARTICIPANTS_INVALID");
    }

    const members = await resolveActiveMembersForScope({
      companyId: payload.company_id,
      userIds: uniqueUserIds,
    });

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
        DO UPDATE SET
          archived_at = NULL,
          updated_at = NOW()
        RETURNING *`;

      const createdConversation = rows[0];

      for (const member of members) {
        const activeMembership = await tx.$queryRaw<Array<Record<string, any>>>`
          SELECT id
          FROM chat_conversation_members
          WHERE conversation_id = ${createdConversation.id}::uuid
            AND user_id = ${member.user_id}::uuid
            AND removed_at IS NULL
          LIMIT 1`;

        if (activeMembership[0]) {
          continue;
        }

        const removedMembership = await tx.$queryRaw<Array<Record<string, any>>>`
          SELECT id
          FROM chat_conversation_members
          WHERE conversation_id = ${createdConversation.id}::uuid
            AND user_id = ${member.user_id}::uuid
            AND removed_at IS NOT NULL
          ORDER BY removed_at DESC NULLS LAST, joined_at DESC, id DESC
          LIMIT 1`;

        if (removedMembership[0]?.id) {
          await tx.$executeRaw`
            UPDATE chat_conversation_members
            SET removed_at = NULL,
                removed_by = NULL,
                added_by = ${payload.created_by}::uuid,
                team_member_id = ${member.id}::uuid
            WHERE id = ${removedMembership[0].id}::uuid`;
          continue;
        }

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
          `;
      }

      return createdConversation;
    });

    logger.info("ChatService.createDirectConversation: ensured direct conversation", {
      companyId: payload.company_id,
      conversationId: conversation.id,
      createdBy: payload.created_by,
      participantUserIds: uniqueUserIds,
    });

    await emitConversationEvent({
      type: "chat.conversation.created",
      company_id: payload.company_id,
      conversation_id: conversation.id,
    });

    return mapConversation(conversation);
  },

  async createGroupConversation(payload: CreateGroupConversationDTO) {
    ChatAuthorizationService.assertCanModerateWorkspace(payload.requester_access);

    const uniqueUserIds = [...new Set([payload.created_by, ...payload.participant_user_ids])];

    if (!payload.name.trim()) {
      throw new ChatHttpError(400, "Group name is required", "CHAT_GROUP_NAME_REQUIRED");
    }

    const members = await resolveActiveMembersForScope({
      companyId: payload.company_id,
      userIds: uniqueUserIds,
    });

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

    logger.info("ChatService.createGroupConversation: created group conversation", {
      companyId: payload.company_id,
      conversationId: conversation.id,
      createdBy: payload.created_by,
      memberCount: members.length,
      name: payload.name.trim(),
    });

    await emitConversationEvent({
      type: "chat.conversation.created",
      company_id: payload.company_id,
      conversation_id: conversation.id,
    });

    return mapConversation(conversation);
  },

  async addMembers(params: {
    conversationId: string;
    companyId: string;
    requesterUserId: string;
    requesterAccess?: string | null;
    participantUserIds?: string[];
    participantTeamMemberIds?: string[];
  }) {
    const conversation = await ChatAuthorizationService.assertCanManageGroup({
      conversationId: params.conversationId,
      companyId: params.companyId,
      userId: params.requesterUserId,
      access: params.requesterAccess,
    });

    const members = await resolveActiveMembersForScope({
      companyId: params.companyId,
      userIds: params.participantUserIds,
      teamMemberIds: params.participantTeamMemberIds,
    });

    await prisma.$transaction(async (tx) => {
      for (const member of members) {
        const activeMembership = await tx.$queryRaw<Array<Record<string, any>>>`
          SELECT id
          FROM chat_conversation_members
          WHERE conversation_id = ${conversation.id}::uuid
            AND user_id = ${member.user_id}::uuid
            AND removed_at IS NULL
          LIMIT 1`;

        if (activeMembership[0]) {
          continue;
        }

        const removedMembership = await tx.$queryRaw<Array<Record<string, any>>>`
          SELECT id
          FROM chat_conversation_members
          WHERE conversation_id = ${conversation.id}::uuid
            AND user_id = ${member.user_id}::uuid
            AND removed_at IS NOT NULL
          ORDER BY removed_at DESC NULLS LAST, joined_at DESC, id DESC
          LIMIT 1`;

        if (removedMembership[0]?.id) {
          await tx.$executeRaw`
            UPDATE chat_conversation_members
            SET removed_at = NULL,
                removed_by = NULL,
                added_by = ${params.requesterUserId}::uuid,
                team_member_id = ${member.id}::uuid
            WHERE id = ${removedMembership[0].id}::uuid`;
          continue;
        }

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
          `;
      }
    });

    await createSystemMessage({
      conversationId: conversation.id,
      companyId: params.companyId,
      body: `Members added to ${conversation.name ?? "group chat"}`,
    });

    logger.info("ChatService.addMembers: members added to conversation", {
      companyId: params.companyId,
      conversationId: conversation.id,
      requesterUserId: params.requesterUserId,
      addedUserIds: members.map((member) => member.user_id),
      addedCount: members.length,
    });

    RequestCacheService.invalidateChatMembershipForConversation(
      conversation.id,
      { reason: "chat_membership_changed" },
    );

    await Promise.all(
      members.map((member) =>
        emitConversationEvent({
          type: "chat.member.added",
          company_id: params.companyId,
          conversation_id: conversation.id,
          user_id: member.user_id,
          actor_user_id: params.requesterUserId,
        }),
      ),
    );

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

    logger.info("ChatService.removeMember: member removed from conversation", {
      companyId: params.companyId,
      conversationId: conversation.id,
      requesterUserId: params.requesterUserId,
      targetUserId: params.targetUserId,
    });

    RequestCacheService.invalidateChatMembershipForConversation(
      conversation.id,
      { reason: "chat_membership_changed" },
    );

    await emitConversationEvent({
      type: "chat.member.removed",
      company_id: params.companyId,
      conversation_id: conversation.id,
      user_id: params.targetUserId,
      actor_user_id: params.requesterUserId,
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

    logger.info("ChatService.renameGroup: group renamed", {
      companyId: params.companyId,
      conversationId: conversation.id,
      requesterUserId: params.requesterUserId,
      name,
    });

    RequestCacheService.invalidateChatMembershipForConversation(
      conversation.id,
      { reason: "chat_conversation_changed" },
    );

    await emitConversationEvent({
      type: "chat.conversation.updated",
      company_id: params.companyId,
      conversation_id: conversation.id,
    });

    return { success: true };
  },

  async deleteConversation(params: {
    conversationId: string;
    companyId: string;
    requesterUserId: string;
    requesterAccess?: string | null;
  }) {
    const conversation = await ChatAuthorizationService.assertCanDeleteConversation({
      conversationId: params.conversationId,
      companyId: params.companyId,
      userId: params.requesterUserId,
      access: params.requesterAccess,
    });

    const result = await prisma.$queryRaw<Array<Record<string, any>>>`
      UPDATE chat_conversations
      SET archived_at = NOW(),
          updated_at = NOW()
      WHERE id = ${conversation.id}::uuid
        AND archived_at IS NULL
      RETURNING id`;

    if (!result[0]) {
      throw new ChatHttpError(
        404,
        "Conversation not found",
        "CHAT_CONVERSATION_NOT_FOUND",
      );
    }

    logger.info("ChatService.deleteConversation: conversation archived", {
      companyId: params.companyId,
      conversationId: conversation.id,
      requesterUserId: params.requesterUserId,
      conversationType: conversation.type,
    });

    RequestCacheService.invalidateChatMembershipForConversation(
      conversation.id,
      { reason: "chat_conversation_changed" },
    );

    await emitConversationEvent({
      type: "chat.conversation.updated",
      company_id: params.companyId,
      conversation_id: conversation.id,
    });

    return { success: true };
  },

  async sendMessage(
    params: CreateChatMessageDTO & {
      requesterUserId: string;
      requesterAccess?: string | null;
      requestPath?: string;
    },
  ) {
    const uniqueTags = normalizeMessageTags(params.tags);
    await ChatAuthorizationService.assertCanSendMessages({
      conversationId: params.conversation_id,
      companyId: params.company_id,
      userId: params.requesterUserId,
      requestPath: params.requestPath,
    });

    const baseMessageType = (params.message_type ?? "text") as ChatMessageType;
    const messageType =
      uniqueTags.length && baseMessageType === "text" ? "tagged" : baseMessageType;
    const body = params.body.trim();

    if (!body) {
      throw new ChatHttpError(400, "Message body is required", "CHAT_MESSAGE_BODY_REQUIRED");
    }
    if (messageType === "system") {
      throw new ChatHttpError(403, "System messages can only be created by the server", "CHAT_SYSTEM_MESSAGE_FORBIDDEN");
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
            INSERT INTO chat_message_tags (message_id, tag, created_at, created_by)
            VALUES (${inserted[0].id}::uuid, ${tag}, NOW(), ${params.requesterUserId}::uuid)
            ON CONFLICT (message_id, tag) DO NOTHING`;
        }
      }

      return inserted;
    });

    logger.info("ChatService.sendMessage: message sent", {
      companyId: params.company_id,
      conversationId: params.conversation_id,
      messageId: rows[0].id,
      requesterUserId: params.requesterUserId,
      messageType,
      tagCount: uniqueTags.length,
      replyToMessageId: params.reply_to_message_id ?? null,
    });

    await emitConversationEvent({
      type: "chat.message.created",
      company_id: params.company_id,
      conversation_id: params.conversation_id,
      message_id: rows[0].id,
    });

    return (await getMessageListItemById(rows[0].id)) ?? mapMessageListItem(rows[0]);
  },

  async updateMessageTags(params: {
    messageId: string;
    companyId: string;
    requesterUserId: string;
    requesterAccess?: string | null;
    tags: UpdateChatMessageTagsDTO["tags"];
    requestPath?: string;
  }) {
    const message = await getMessageTagContext({
      messageId: params.messageId,
      companyId: params.companyId,
      requesterUserId: params.requesterUserId,
    });

    const nextTags = normalizeMessageTags(params.tags).sort();
    const currentTags = [...message.tags].sort();
    if (currentTags.join("|") === nextTags.join("|")) {
      return (await getMessageListItemById(params.messageId)) ?? null;
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        DELETE FROM chat_message_tags
        WHERE message_id = ${params.messageId}::uuid`;

      for (const tag of nextTags) {
        await tx.$executeRaw`
          INSERT INTO chat_message_tags (message_id, tag, created_at, created_by)
          VALUES (${params.messageId}::uuid, ${tag}, NOW(), ${params.requesterUserId}::uuid)
          ON CONFLICT (message_id, tag) DO NOTHING`;
      }

      const rows = await tx.$queryRaw<Array<Record<string, any>>>`
        UPDATE chat_messages
        SET message_type = CASE
              WHEN message_type IN (${ "text" }, ${ "tagged" })
                THEN ${nextTags.length ? "tagged" : "text"}
              ELSE message_type
            END,
            updated_at = NOW()
        WHERE id = ${params.messageId}::uuid
        RETURNING *`;

      return rows[0];
    });

    logger.info("ChatService.updateMessageTags: message tags updated", {
      companyId: params.companyId,
      conversationId: updated.conversation_id,
      messageId: updated.id,
      requesterUserId: params.requesterUserId,
      tagCount: nextTags.length,
    });

    await emitConversationEvent({
      type: "chat.message.updated",
      company_id: params.companyId,
      conversation_id: updated.conversation_id,
      message_id: updated.id,
    });

    const updatedMessage = await getMessageListItemById(updated.id);
    if (!updatedMessage) {
      throw new ChatHttpError(
        500,
        "Failed to reload the updated message tags",
        "CHAT_TAG_RELOAD_FAILED",
      );
    }

    return updatedMessage;
  },

  async editMessage(params: {
    messageId: string;
    companyId: string;
    requesterUserId: string;
    requesterTeamMemberId?: string | null;
    requesterAccess?: string | null;
    body: string;
  }) {
    const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT
        m.*,
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
    if (!message) throw new ChatHttpError(404, "Message not found", "CHAT_MESSAGE_NOT_FOUND");
    if (!message.requester_is_member) throw new ChatHttpError(403, "You do not have access to this conversation", "CHAT_ACCESS_DENIED");
    if (message.sender_team_member_id !== params.requesterTeamMemberId) {
      throw new ChatHttpError(403, "You can only edit your own messages", "CHAT_EDIT_FORBIDDEN");
    }
    if (message.message_type === "system") throw new ChatHttpError(403, "System messages cannot be edited", "CHAT_SYSTEM_EDIT_FORBIDDEN");

    const body = params.body.trim();
    if (!body) throw new ChatHttpError(400, "Message body is required", "CHAT_MESSAGE_BODY_REQUIRED");

    const createdAt = new Date(message.created_at);
    const editCutoff = new Date(createdAt.getTime() + CHAT_MESSAGE_EDIT_WINDOW_MINUTES * 60 * 1000);
    if (new Date() > editCutoff) {
      throw new ChatHttpError(
        403,
        `Messages can only be edited within ${CHAT_MESSAGE_EDIT_WINDOW_MINUTES} minutes of sending`,
        "CHAT_EDIT_WINDOW_EXPIRED",
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO chat_message_edits (message_id, previous_body, edited_by, edited_at)
        VALUES (${params.messageId}::uuid, ${message.body}, ${params.requesterUserId}::uuid, NOW())`;

      const updateRows = await tx.$queryRaw<Array<Record<string, any>>>`
        UPDATE chat_messages
        SET body = ${body},
            edited_at = NOW(),
            updated_at = NOW()
        WHERE id = ${params.messageId}::uuid
        RETURNING *`;

      return updateRows[0];
    });

    logger.info("ChatService.editMessage: message edited", {
      companyId: params.companyId,
      conversationId: updated.conversation_id,
      messageId: updated.id,
      requesterUserId: params.requesterUserId,
      moderated: false,
    });

    await emitConversationEvent({
      type: "chat.message.updated",
      company_id: params.companyId,
      conversation_id: updated.conversation_id,
      message_id: updated.id,
    });

    return (await getMessageListItemById(updated.id)) ?? mapMessageListItem(updated);
  },

  async deleteMessage(params: {
    messageId: string;
    companyId: string;
    requesterUserId: string;
    requesterTeamMemberId?: string | null;
    requesterAccess?: string | null;
  }) {
    const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT
        m.*,
        c.type AS conversation_type,
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
    if (!message) throw new ChatHttpError(404, "Message not found", "CHAT_MESSAGE_NOT_FOUND");
    if (!message.requester_is_member) throw new ChatHttpError(403, "You do not have access to this conversation", "CHAT_ACCESS_DENIED");
    if (message.deleted_at) return { success: true };

    const canModerate =
      params.requesterAccess === "admin" || params.requesterAccess === "superAdmin";
    const canModerateGroupDelete =
      canModerate && message.conversation_type === "group";
    if (
      message.sender_team_member_id !== params.requesterTeamMemberId &&
      !canModerateGroupDelete
    ) {
      throw new ChatHttpError(403, "You can only delete your own messages", "CHAT_DELETE_FORBIDDEN");
    }
    if (message.message_type === "system" && !canModerate) {
      throw new ChatHttpError(403, "System messages cannot be deleted", "CHAT_SYSTEM_DELETE_FORBIDDEN");
    }

    const updatedRows = await prisma.$queryRaw<Array<Record<string, any>>>`
      UPDATE chat_messages
      SET body = ${"Message deleted"},
          deleted_at = NOW(),
          updated_at = NOW(),
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('deleted_by', ${params.requesterUserId}::uuid)
      WHERE id = ${params.messageId}::uuid
      RETURNING *`;

    const updated = updatedRows[0];

    logger.info("ChatService.deleteMessage: message soft deleted", {
      companyId: params.companyId,
      conversationId: updated.conversation_id,
      messageId: updated.id,
      requesterUserId: params.requesterUserId,
      moderated: message.sender_team_member_id !== params.requesterTeamMemberId,
    });

    await emitConversationEvent({
      type: "chat.message.deleted",
      company_id: params.companyId,
      conversation_id: updated.conversation_id,
      message_id: updated.id,
    });

    return { success: true };
  },

  async markConversationRead(params: {
    conversationId: string;
    companyId: string;
    userId: string;
    lastReadMessageId?: string | null;
    lastReadAt?: string | null;
    requestPath?: string;
  }) {
    await ChatAuthorizationService.assertCanViewConversation({
      conversationId: params.conversationId,
      companyId: params.companyId,
      userId: params.userId,
      requestPath: params.requestPath,
    });

    const normalizedLastReadAt = normalizeIsoTimestamp(params.lastReadAt ?? null);
    let resolvedLastReadAt = normalizedLastReadAt;

    if (params.lastReadMessageId) {
      const messageRows = await prisma.$queryRaw<Array<Record<string, any>>>`
        SELECT created_at
        FROM chat_messages
        WHERE id = ${params.lastReadMessageId}::uuid
          AND conversation_id = ${params.conversationId}::uuid
          AND company_id = ${params.companyId}::uuid
        LIMIT 1`;

      const message = messageRows[0];
      if (!message) {
        throw new ChatHttpError(404, "Last read message not found", "CHAT_LAST_READ_MESSAGE_NOT_FOUND");
      }

      resolvedLastReadAt = message.created_at;
    }

    const targetLastReadAt = resolvedLastReadAt ?? new Date().toISOString();
    const currentRows = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT last_read_message_id, last_read_at
      FROM chat_conversation_members
      WHERE conversation_id = ${params.conversationId}::uuid
        AND user_id = ${params.userId}::uuid
        AND removed_at IS NULL
      LIMIT 1`;

    const current = currentRows[0];
    if (!current) {
      throw new ChatHttpError(
        404,
        "Conversation member not found",
        "CHAT_MEMBER_NOT_FOUND",
      );
    }

    const targetTime = new Date(targetLastReadAt).getTime();
    const currentTime = current.last_read_at
      ? new Date(current.last_read_at).getTime()
      : null;
    const incomingMessageId = params.lastReadMessageId ?? null;

    if (
      currentTime !== null &&
      targetTime === currentTime &&
      (current.last_read_message_id ?? null) === incomingMessageId
    ) {
      readCursorEventCount += 1;
      if (shouldSampleChatLog(readCursorEventCount, READ_CURSOR_LOG_SAMPLE_INTERVAL)) {
        logger.info("ChatService.markConversationRead: skipped unchanged read cursor", {
          companyId: params.companyId,
          conversationId: params.conversationId,
          userId: params.userId,
          lastReadMessageId: incomingMessageId,
          lastReadAt: targetLastReadAt,
        });
      }
      return { success: true };
    }

    if (currentTime !== null && targetTime < currentTime) {
      readCursorEventCount += 1;
      if (shouldSampleChatLog(readCursorEventCount, READ_CURSOR_LOG_SAMPLE_INTERVAL)) {
        logger.info("ChatService.markConversationRead: skipped stale read cursor", {
          companyId: params.companyId,
          conversationId: params.conversationId,
          userId: params.userId,
          lastReadMessageId: incomingMessageId,
          lastReadAt: targetLastReadAt,
          currentLastReadMessageId: current.last_read_message_id ?? null,
          currentLastReadAt: current.last_read_at ?? null,
        });
      }
      return { success: true };
    }

    const updatedRows = await prisma.$queryRaw<Array<Record<string, any>>>`
      UPDATE chat_conversation_members
      SET last_read_message_id = ${incomingMessageId}::uuid,
          last_read_at = ${targetLastReadAt}::timestamp
      WHERE conversation_id = ${params.conversationId}::uuid
        AND user_id = ${params.userId}::uuid
        AND removed_at IS NULL
        AND (
          last_read_at IS NULL
          OR last_read_at < ${targetLastReadAt}::timestamp
          OR (
            last_read_at = ${targetLastReadAt}::timestamp
            AND COALESCE(last_read_message_id::text, '') <> COALESCE(${incomingMessageId}, '')
          )
        )
      RETURNING last_read_message_id, last_read_at`;

    if (!updatedRows[0]) {
      const finalRows = await prisma.$queryRaw<Array<Record<string, any>>>`
        SELECT last_read_message_id, last_read_at
        FROM chat_conversation_members
        WHERE conversation_id = ${params.conversationId}::uuid
          AND user_id = ${params.userId}::uuid
          AND removed_at IS NULL
        LIMIT 1`;

      const finalState = finalRows[0];
      const finalTime = finalState?.last_read_at
        ? new Date(finalState.last_read_at).getTime()
        : null;
      const outcome =
        finalTime !== null && finalTime > targetTime
          ? "stale"
          : finalState?.last_read_message_id === incomingMessageId &&
              finalState?.last_read_at === targetLastReadAt
            ? "unchanged"
            : "stale";

      const loggedTargetLastReadAt = targetLastReadAt
        ? new Date(targetLastReadAt).toISOString()
        : null;
      const loggedCurrentLastReadAt =
        finalState?.last_read_at
          ? new Date(finalState.last_read_at).toISOString()
          : null;

      readCursorEventCount += 1;
      if (shouldSampleChatLog(readCursorEventCount, READ_CURSOR_LOG_SAMPLE_INTERVAL)) {
        logger.info(
          `ChatService.markConversationRead: skipped ${outcome} read cursor`,
          {
            companyId: params.companyId,
            conversationId: params.conversationId,
            userId: params.userId,
            lastReadMessageId: incomingMessageId,
            lastReadAt: loggedTargetLastReadAt,
            currentLastReadMessageId: finalState?.last_read_message_id ?? null,
            currentLastReadAt: loggedCurrentLastReadAt,
          },
        );
      }

      return { success: true };
    }

    readCursorEventCount += 1;
    if (shouldSampleChatLog(readCursorEventCount, READ_CURSOR_LOG_SAMPLE_INTERVAL)) {
      logger.info("ChatService.markConversationRead: read cursor update applied", {
        companyId: params.companyId,
        conversationId: params.conversationId,
        userId: params.userId,
        lastReadMessageId: incomingMessageId,
        lastReadAt: targetLastReadAt ? new Date(targetLastReadAt).toISOString() : null,
      });
    }

    return { success: true };
  },

  async updateConversationPreferences(params: {
    conversationId: string;
    companyId: string;
    userId: string;
    notificationsMuted: boolean;
    requestPath?: string;
  }) {
    await ChatAuthorizationService.assertCanViewConversation({
      conversationId: params.conversationId,
      companyId: params.companyId,
      userId: params.userId,
      requestPath: params.requestPath,
    });

    const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
      UPDATE chat_conversation_members
      SET notifications_muted = ${params.notificationsMuted}
      WHERE conversation_id = ${params.conversationId}::uuid
        AND user_id = ${params.userId}::uuid
        AND removed_at IS NULL
      RETURNING id, notifications_muted`;

    if (!rows[0]) {
      throw new ChatHttpError(
        404,
        "Conversation member preferences not found",
        "CHAT_PREFERENCES_NOT_FOUND",
      );
    }

    await emitConversationEvent({
      type: "chat.conversation.updated",
      company_id: params.companyId,
      conversation_id: params.conversationId,
    });

    return {
      success: true,
      notifications_muted: Boolean(rows[0].notifications_muted),
    };
  },

  async emitTypingIndicator(params: {
    conversationId: string;
    companyId: string;
    userId: string;
    isTyping: boolean;
    requestPath?: string;
  }) {
    await ChatAuthorizationService.assertCanSendMessages({
      conversationId: params.conversationId,
      companyId: params.companyId,
      userId: params.userId,
      requestPath: params.requestPath,
    });

    const userIds = await getConversationMemberUserIds(params.conversationId);

    await chatRealtimeService.sendTypingIndicator({
      companyId: params.companyId,
      conversationId: params.conversationId,
      userId: params.userId,
      userIds,
      isTyping: params.isTyping,
    });

    typingEventCount += 1;
    if (shouldSampleChatLog(typingEventCount, TYPING_LOG_SAMPLE_INTERVAL)) {
      logger.info("ChatService.emitTypingIndicator: typing event emitted", {
        companyId: params.companyId,
        conversationId: params.conversationId,
        userId: params.userId,
        isTyping: params.isTyping,
        recipientCount: userIds.length,
      });
    }

    return { success: true };
  },
};
