import { Response } from "express";
import { z } from "zod";
import {
  AddConversationMembersDTO,
  ChatListQueryDTO,
  ChatMessageListQueryDTO,
  CreateDirectConversationDTO,
  CreateGroupConversationDTO,
  DeleteMessageDTO,
  EditMessageDTO,
  MarkConversationReadDTO,
  RenameConversationDTO,
  SendMessageDTO,
  TaggedMessageListQueryDTO,
  TypingIndicatorDTO,
  UpdateMessageTagsDTO,
  UpdateConversationPreferencesDTO,
} from "../dtos/chat.dto";
import admin from "../config/firebaseAdmin";
import { ChatService } from "../services/chat.service";
import { chatRealtimeService } from "../services/chatRealtime.service";
import { ChatHttpError, isChatHttpError } from "../services/chatErrors";
import { RequestCacheService } from "../services/requestCache.service";
import { UserService } from "../services/user.service";
import { logger } from "../utils/logger";

function getChatRequestContext(req: any) {
  const companyId = req.user?.company_id;
  const userId = req.user?.id;

  if (!companyId || !userId) {
    throw new Error("Unauthorized");
  }

  return {
    companyId,
    userId,
    teamMemberId: req.user?.team_member_id ?? null,
    access: req.user?.access ?? null,
  };
}

function handleChatControllerError(res: Response, error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: "Invalid chat request payload",
      code: "CHAT_VALIDATION_FAILED",
      details: error.flatten(),
    });
  }

  if (isChatHttpError(error)) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
    });
  }

  if (error instanceof Error && error.message === "Unauthorized") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return res.status(500).json({ error: fallback });
}

export const ChatController = {
  async listConversations(req: any, res: Response) {
    try {
      const { companyId, userId, access } = getChatRequestContext(req);
      const query = ChatListQueryDTO.parse(req.query);
      const conversations = await ChatService.listConversations(
        {
          companyId,
          userId,
          limit: query.limit ?? 50,
          cursorConversationId: query.cursorConversationId ?? null,
          requestPath: req.path,
        },
      );

      const nextCursor =
        conversations.length === (query.limit ?? 50)
          ? conversations[conversations.length - 1]?.id ?? null
          : null;

      return res.json({ conversations, nextCursor });
    } catch (error) {
      logger.error("ChatController.listConversations failed", { error });
      return handleChatControllerError(
        res,
        error,
        "Failed to fetch conversations",
      );
    }
  },

  async getConversation(req: any, res: Response) {
    try {
      const { companyId, userId } = getChatRequestContext(req);
      const conversation = await ChatService.getConversationDetails({
        conversationId: req.params.conversationId,
        companyId,
        userId,
        access: req.user?.access ?? null,
      });

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      return res.json({ conversation });
    } catch (error) {
      logger.error("ChatController.getConversation failed", { error });
      return handleChatControllerError(res, error, "Failed to fetch conversation");
    }
  },

  async listMessages(req: any, res: Response) {
    try {
      const { companyId, userId } = getChatRequestContext(req);
      const query = ChatMessageListQueryDTO.parse(req.query);
      const messages = await ChatService.listMessages({
        conversationId: req.params.conversationId,
        companyId,
        userId,
        limit: query.limit ?? 50,
        cursorMessageId: query.cursorMessageId ?? null,
      });

      const nextCursor =
        messages.length === (query.limit ?? 50)
          ? messages[messages.length - 1]?.id ?? null
          : null;

      return res.json({ messages, nextCursor });
    } catch (error) {
      logger.error("ChatController.listMessages failed", { error });
      return handleChatControllerError(res, error, "Failed to fetch messages");
    }
  },

  async listTaggedMessages(req: any, res: Response) {
    try {
      const { companyId, userId } = getChatRequestContext(req);
      const query = TaggedMessageListQueryDTO.parse(req.query);
      const messages = await ChatService.listTaggedMessages({
        conversationId: req.params.conversationId,
        companyId,
        userId,
        limit: query.limit ?? 50,
        tag: query.tag ?? null,
        requestPath: req.path,
      });

      return res.json({ messages });
    } catch (error) {
      logger.error("ChatController.listTaggedMessages failed", { error });
      return handleChatControllerError(
        res,
        error,
        "Failed to fetch tagged messages",
      );
    }
  },

  async createDirectConversation(req: any, res: Response) {
    try {
      const { companyId, userId } = getChatRequestContext(req);
      const body = CreateDirectConversationDTO.parse(req.body);

      const participantUserIds =
        body.target_user_id
          ? [userId, body.target_user_id]
          : [
              userId,
              await ChatController.resolveTargetUserIdFromTeamMember(
                companyId,
                body.target_team_member_id!,
              ),
            ];

      const conversation = await ChatService.createDirectConversation({
        company_id: companyId,
        created_by: userId,
        participant_user_ids: participantUserIds as [string, string],
      });

      return res.status(201).json({ conversation });
    } catch (error) {
      logger.error("ChatController.createDirectConversation failed", { error });
      return handleChatControllerError(
        res,
        error,
        "Failed to create direct conversation",
      );
    }
  },

  async createGroupConversation(req: any, res: Response) {
    try {
      const { companyId, userId, access } = getChatRequestContext(req);
      const body = CreateGroupConversationDTO.parse(req.body);
      const participantUserIds = await ChatService.resolveParticipantUserIds({
        companyId,
        participantUserIds: body.participant_user_ids,
        participantTeamMemberIds: body.participant_team_member_ids,
      });

      const conversation = await ChatService.createGroupConversation({
        company_id: companyId,
        created_by: userId,
        requester_access: access,
        name: body.name,
        participant_user_ids: participantUserIds,
        metadata: body.metadata,
      });

      return res.status(201).json({ conversation });
    } catch (error) {
      logger.error("ChatController.createGroupConversation failed", { error });
      return handleChatControllerError(
        res,
        error,
        "Failed to create group conversation",
      );
    }
  },

  async addMembers(req: any, res: Response) {
    try {
      const { companyId, userId, access } = getChatRequestContext(req);
      const body = AddConversationMembersDTO.parse(req.body);

      const result = await ChatService.addMembers({
        conversationId: req.params.conversationId,
        companyId,
        requesterUserId: userId,
        requesterAccess: access,
        participantUserIds: body.participant_user_ids,
        participantTeamMemberIds: body.participant_team_member_ids,
      });

      return res.json(result);
    } catch (error) {
      logger.error("ChatController.addMembers failed", { error });
      return handleChatControllerError(res, error, "Failed to add members");
    }
  },

  async removeMember(req: any, res: Response) {
    try {
      const { companyId, userId, access } = getChatRequestContext(req);
      const result = await ChatService.removeMember({
        conversationId: req.params.conversationId,
        companyId,
        requesterUserId: userId,
        requesterAccess: access,
        targetUserId: req.params.userId,
      });

      return res.json(result);
    } catch (error) {
      logger.error("ChatController.removeMember failed", { error });
      return handleChatControllerError(res, error, "Failed to remove member");
    }
  },

  async renameGroup(req: any, res: Response) {
    try {
      const { companyId, userId, access } = getChatRequestContext(req);
      const body = RenameConversationDTO.parse(req.body);
      const result = await ChatService.renameGroup({
        conversationId: req.params.conversationId,
        companyId,
        requesterUserId: userId,
        requesterAccess: access,
        name: body.name,
      });

      return res.json(result);
    } catch (error) {
      logger.error("ChatController.renameGroup failed", { error });
      return handleChatControllerError(res, error, "Failed to rename group");
    }
  },

  async deleteConversation(req: any, res: Response) {
    try {
      const { companyId, userId, access } = getChatRequestContext(req);
      const result = await ChatService.deleteConversation({
        conversationId: req.params.conversationId,
        companyId,
        requesterUserId: userId,
        requesterAccess: access,
      });

      return res.json(result);
    } catch (error) {
      logger.error("ChatController.deleteConversation failed", { error });
      return handleChatControllerError(res, error, "Failed to delete conversation");
    }
  },

  async sendMessage(req: any, res: Response) {
    try {
      const { companyId, userId, teamMemberId, access } = getChatRequestContext(req);
      const body = SendMessageDTO.parse(req.body);
      const message = await ChatService.sendMessage({
        conversation_id: req.params.conversationId,
        company_id: companyId,
        requesterUserId: userId,
        requesterAccess: access,
        requestPath: req.path,
        sender_team_member_id: teamMemberId,
        body: body.body,
        message_type: body.message_type,
        reply_to_message_id: body.reply_to_message_id ?? null,
        metadata: body.metadata,
        tags: body.tags,
      });

      return res.status(201).json({ message });
    } catch (error) {
      logger.error("ChatController.sendMessage failed", { error });
      return handleChatControllerError(res, error, "Failed to send message");
    }
  },

  async editMessage(req: any, res: Response) {
    try {
      const { companyId, userId, teamMemberId, access } = getChatRequestContext(req);
      const body = EditMessageDTO.parse(req.body);
      const message = await ChatService.editMessage({
        messageId: req.params.messageId,
        companyId,
        requesterUserId: userId,
        requesterTeamMemberId: teamMemberId,
        requesterAccess: access,
        body: body.body,
      });

      return res.json({ message });
    } catch (error) {
      logger.error("ChatController.editMessage failed", { error });
      return handleChatControllerError(res, error, "Failed to edit message");
    }
  },

  async updateMessageTags(req: any, res: Response) {
    try {
      const { companyId, userId, access } = getChatRequestContext(req);
      const body = UpdateMessageTagsDTO.parse(req.body);
      const message = await ChatService.updateMessageTags({
        messageId: req.params.messageId,
        companyId,
        requesterUserId: userId,
        requesterAccess: access,
        tags: body.tags,
        requestPath: req.path,
      });

      return res.json({ message });
    } catch (error) {
      logger.error("ChatController.updateMessageTags failed", { error });
      return handleChatControllerError(res, error, "Failed to update message tags");
    }
  },

  async deleteMessage(req: any, res: Response) {
    try {
      const { companyId, userId, teamMemberId, access } = getChatRequestContext(req);
      DeleteMessageDTO.parse(req.body ?? {});

      const result = await ChatService.deleteMessage({
        messageId: req.params.messageId,
        companyId,
        requesterUserId: userId,
        requesterTeamMemberId: teamMemberId,
        requesterAccess: access,
      });

      return res.json(result);
    } catch (error) {
      logger.error("ChatController.deleteMessage failed", { error });
      return handleChatControllerError(res, error, "Failed to delete message");
    }
  },

  async markConversationRead(req: any, res: Response) {
    try {
      const { companyId, userId } = getChatRequestContext(req);
      const body = MarkConversationReadDTO.parse(req.body);

      const result = await ChatService.markConversationRead({
        conversationId: req.params.conversationId,
        companyId,
        userId,
        lastReadMessageId: body.last_read_message_id ?? null,
        lastReadAt: body.last_read_at ?? null,
        requestPath: req.path,
      });

      return res.json(result);
    } catch (error) {
      logger.error("ChatController.markConversationRead failed", { error });
      return handleChatControllerError(res, error, "Failed to mark conversation as read");
    }
  },

  async streamChat(req: any, res: Response) {
    const token = String(req.query.token ?? "").trim();

    if (!token) {
      return res.status(401).json({ error: "Missing chat stream token" });
    }

    try {
      const decoded =
        RequestCacheService.getVerifiedToken(token, {
          requestPath: req.path,
        }) ?? (await admin.auth().verifyIdToken(token, true));

      RequestCacheService.setVerifiedToken(token, decoded, {
        requestPath: req.path,
      });

      const cachedUser = RequestCacheService.getUser(decoded.uid, {
        requestPath: req.path,
      });
      const user = cachedUser ?? (await UserService.findByFirebaseUid(decoded.uid));

      if (!user?.company_id || !user?.id) {
        return res.status(403).json({ error: "Chat stream unavailable" });
      }

      if (!cachedUser && user) {
        RequestCacheService.setUser(decoded.uid, user, {
          requestPath: req.path,
        });
      }

      const closePresenceSession = await chatRealtimeService.openPresenceSession(
        user.company_id,
        user.id,
      );

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      const writeEvent = (event: string, data: unknown) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      writeEvent("connected", {
        companyId: user.company_id,
        userId: user.id,
      });

      const unsubscribe = chatRealtimeService.subscribe(
        user.company_id,
        user.id,
        (event) => {
          writeEvent("chat", event);
        },
      );

      const keepAlive = setInterval(() => {
        writeEvent("ping", { ts: new Date().toISOString() });
      }, 25000);

      req.on("close", () => {
        clearInterval(keepAlive);
        unsubscribe();
        void closePresenceSession();
        res.end();
      });
    } catch (error: any) {
      logger.error("ChatController.streamChat failed", {
        error: error.message,
      });

      return res.status(401).json({ error: "Invalid or expired token" });
    }
  },

  async resolveTargetUserIdFromTeamMember(companyId: string, teamMemberId: string) {
    const userId = await ChatService.resolveDirectTargetUser(companyId, teamMemberId);
    if (!userId) {
      throw new ChatHttpError(400, "Direct chat target must be an active workspace member", "CHAT_INVALID_PARTICIPANTS");
    }
    return userId;
  },

  async updateConversationPreferences(req: any, res: Response) {
    try {
      const { companyId, userId } = getChatRequestContext(req);
      const body = UpdateConversationPreferencesDTO.parse(req.body);

      const result = await ChatService.updateConversationPreferences({
        conversationId: req.params.conversationId,
        companyId,
        userId,
        notificationsMuted: body.notifications_muted,
        requestPath: req.path,
      });

      return res.json(result);
    } catch (error) {
      logger.error("ChatController.updateConversationPreferences failed", { error });
      return handleChatControllerError(
        res,
        error,
        "Failed to update conversation preferences",
      );
    }
  },

  async sendTypingIndicator(req: any, res: Response) {
    try {
      const { companyId, userId } = getChatRequestContext(req);
      const body = TypingIndicatorDTO.parse(req.body);

      const result = await ChatService.emitTypingIndicator({
        conversationId: req.params.conversationId,
        companyId,
        userId,
        isTyping: body.isTyping,
        requestPath: req.path,
      });

      return res.json(result);
    } catch (error) {
      logger.error("ChatController.sendTypingIndicator failed", { error });
      return handleChatControllerError(
        res,
        error,
        "Failed to send typing indicator",
      );
    }
  },
};
