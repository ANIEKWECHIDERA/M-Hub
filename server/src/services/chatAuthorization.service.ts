import { prisma } from "../lib/prisma";
import { ChatHttpError } from "./chatErrors";
import { RequestCacheService } from "./requestCache.service";

export type ChatConversationAccessContext = {
  id: string;
  company_id: string;
  type: "direct" | "group";
  name: string | null;
  created_by: string;
  archived_at: string | null;
  metadata: Record<string, unknown> | null;
  requester_is_member: boolean;
};

async function getConversationAccessContext(params: {
  conversationId: string;
  companyId: string;
  userId: string;
  requestPath?: string;
}) {
  const cachedContext = RequestCacheService.getChatMembership(
    params.companyId,
    params.conversationId,
    params.userId,
    { requestPath: params.requestPath },
  );

  if (cachedContext) {
    return cachedContext.context as ChatConversationAccessContext | null;
  }

  const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
    SELECT
      c.id,
      c.company_id,
      c.type,
      c.name,
      c.created_by,
      c.archived_at,
      c.metadata,
      EXISTS (
        SELECT 1
        FROM chat_conversation_members cm
        WHERE cm.conversation_id = c.id
          AND cm.user_id = ${params.userId}::uuid
          AND cm.removed_at IS NULL
      ) AS requester_is_member
    FROM chat_conversations c
    WHERE c.id = ${params.conversationId}::uuid
      AND c.company_id = ${params.companyId}::uuid
      AND c.archived_at IS NULL
    LIMIT 1`;

  const context = (rows[0] as ChatConversationAccessContext | undefined) ?? null;
  RequestCacheService.setChatMembership(
    params.companyId,
    params.conversationId,
    params.userId,
    context,
    { requestPath: params.requestPath },
  );

  return context;
}

function requireActiveMember(
  context: ChatConversationAccessContext | null,
  message = "You do not have access to this conversation",
) {
  if (!context || !context.requester_is_member) {
    throw new ChatHttpError(403, message, "CHAT_ACCESS_DENIED");
  }

  return context;
}

function requireGroupConversation(context: ChatConversationAccessContext) {
  if (context.type !== "group") {
    throw new ChatHttpError(
      400,
      "This action is only available for group conversations",
      "CHAT_GROUP_ONLY",
    );
  }

  return context;
}

function requireMutableGroup(context: ChatConversationAccessContext) {
  const kind =
    context.metadata && typeof context.metadata === "object"
      ? (context.metadata as Record<string, unknown>).kind
      : null;

  if (kind === "general") {
    throw new ChatHttpError(
      403,
      "The General group is system-managed and cannot be edited",
      "CHAT_GENERAL_GROUP_IMMUTABLE",
    );
  }

  return context;
}

function requireModeratorAccess(access?: string | null) {
  if (access !== "admin" && access !== "superAdmin") {
    throw new ChatHttpError(
      403,
      "You are not authorized to perform this chat action",
      "CHAT_MODERATOR_REQUIRED",
    );
  }
}

export const ChatAuthorizationService = {
  async getConversationAccessContext(params: {
    conversationId: string;
    companyId: string;
    userId: string;
    requestPath?: string;
  }) {
    return getConversationAccessContext(params);
  },

  async assertCanViewConversation(params: {
    conversationId: string;
    companyId: string;
    userId: string;
    requestPath?: string;
  }) {
    const context = await getConversationAccessContext(params);
    return requireActiveMember(context);
  },

  async assertCanSendMessages(params: {
    conversationId: string;
    companyId: string;
    userId: string;
    requestPath?: string;
  }) {
    const context = requireActiveMember(await getConversationAccessContext(params));

    if (context.archived_at) {
      throw new ChatHttpError(
        403,
        "This conversation is archived",
        "CHAT_CONVERSATION_ARCHIVED",
      );
    }

    return context;
  },

  async assertCanManageGroup(params: {
    conversationId: string;
    companyId: string;
    userId: string;
    access?: string | null;
    requestPath?: string;
  }) {
    const context = requireMutableGroup(
      requireGroupConversation(
      requireActiveMember(await getConversationAccessContext(params)),
      ),
    );

    requireModeratorAccess(params.access);

    return context;
  },

  async assertCanDeleteConversation(params: {
    conversationId: string;
    companyId: string;
    userId: string;
    access?: string | null;
    requestPath?: string;
  }) {
    const context = requireActiveMember(await getConversationAccessContext(params));

    if (context.type === "group") {
      requireModeratorAccess(params.access);
      return requireMutableGroup(requireGroupConversation(context));
    }

    return context;
  },

  assertCanModerateWorkspace(access?: string | null) {
    requireModeratorAccess(access);
  },
};
