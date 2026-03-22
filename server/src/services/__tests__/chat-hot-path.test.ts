jest.mock("../../lib/prisma", () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
  },
}));

jest.mock("../chatRealtime.service", () => ({
  chatRealtimeService: {
    isOnline: jest.fn(() => false),
    sendTypingIndicator: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
  },
}));

jest.mock("../../utils/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { prisma } from "../../lib/prisma";
import { ChatService } from "../chat.service";
import { ChatAuthorizationService } from "../chatAuthorization.service";
import { chatRealtimeService } from "../chatRealtime.service";
import { RequestCacheService } from "../requestCache.service";

const prismaMock = prisma as unknown as {
  $queryRaw: jest.Mock;
  $executeRaw: jest.Mock;
  $transaction: jest.Mock;
};

const sampleConversationContext = {
  id: "conversation-1",
  company_id: "company-1",
  type: "group" as const,
  name: "Chat",
  created_by: "user-1",
  archived_at: null,
  metadata: null,
  requester_is_member: true,
};

describe("chat hot path protections", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    RequestCacheService.invalidateAll();
  });

  describe("conversation membership cache", () => {
    it("reuses cached membership validation within TTL", async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([sampleConversationContext]);

      await ChatAuthorizationService.assertCanViewConversation({
        conversationId: "conversation-1",
        companyId: "company-1",
        userId: "user-1",
        requestPath: "/chat/conversations/conversation-1/messages",
      });

      await ChatAuthorizationService.assertCanViewConversation({
        conversationId: "conversation-1",
        companyId: "company-1",
        userId: "user-1",
        requestPath: "/chat/conversations/conversation-1/messages",
      });

      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
      expect(
        RequestCacheService.getMetricsSnapshot().chat_membership.hits,
      ).toBeGreaterThan(0);
    });

    it("invalidates cached membership and denies removed members immediately", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([sampleConversationContext])
        .mockResolvedValueOnce([
          { ...sampleConversationContext, requester_is_member: false },
        ]);

      await ChatAuthorizationService.assertCanViewConversation({
        conversationId: "conversation-1",
        companyId: "company-1",
        userId: "user-1",
      });

      RequestCacheService.invalidateChatMembershipForConversation(
        "conversation-1",
        { reason: "chat_membership_changed" },
      );

      await expect(
        ChatAuthorizationService.assertCanViewConversation({
          conversationId: "conversation-1",
          companyId: "company-1",
          userId: "user-1",
        }),
      ).rejects.toMatchObject({ statusCode: 403 });

      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe("markConversationRead", () => {
    beforeEach(() => {
      jest
        .spyOn(ChatAuthorizationService, "assertCanViewConversation")
        .mockResolvedValue(sampleConversationContext);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("does not move the read cursor backward", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([{ created_at: "2026-03-20T09:00:00.000Z" }])
        .mockResolvedValueOnce([
          {
            last_read_message_id: "message-new",
            last_read_at: "2026-03-20T10:00:00.000Z",
          },
        ]);

      const result = await ChatService.markConversationRead({
        conversationId: "conversation-1",
        companyId: "company-1",
        userId: "user-1",
        lastReadMessageId: "message-old",
        requestPath: "/chat/conversations/conversation-1/read",
      });

      expect(result).toEqual({ success: true });
      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it("skips repeated identical read cursor updates without writing", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([{ created_at: "2026-03-20T10:00:00.000Z" }])
        .mockResolvedValueOnce([
          {
            last_read_message_id: "message-1",
            last_read_at: "2026-03-20T10:00:00.000Z",
          },
        ]);

      const result = await ChatService.markConversationRead({
        conversationId: "conversation-1",
        companyId: "company-1",
        userId: "user-1",
        lastReadMessageId: "message-1",
      });

      expect(result).toEqual({ success: true });
      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it("applies newer read cursor updates", async () => {
      prismaMock.$queryRaw
        .mockResolvedValueOnce([{ created_at: "2026-03-20T11:00:00.000Z" }])
        .mockResolvedValueOnce([
          {
            last_read_message_id: "message-1",
            last_read_at: "2026-03-20T10:00:00.000Z",
          },
        ])
        .mockResolvedValueOnce([
          {
            last_read_message_id: "message-2",
            last_read_at: "2026-03-20T11:00:00.000Z",
          },
        ]);

      const result = await ChatService.markConversationRead({
        conversationId: "conversation-1",
        companyId: "company-1",
        userId: "user-1",
        lastReadMessageId: "message-2",
      });

      expect(result).toEqual({ success: true });
      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(3);
    });
  });

  describe("typing endpoint path", () => {
    beforeEach(() => {
      jest
        .spyOn(ChatAuthorizationService, "assertCanSendMessages")
        .mockResolvedValue(sampleConversationContext);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("does not trigger generic user-context invalidation during typing", async () => {
      const invalidateSpy = jest.spyOn(
        RequestCacheService,
        "invalidateUserContext",
      );

      prismaMock.$queryRaw.mockResolvedValueOnce([
        { user_id: "user-1" },
        { user_id: "user-2" },
      ]);

      await ChatService.emitTypingIndicator({
        conversationId: "conversation-1",
        companyId: "company-1",
        userId: "user-1",
        isTyping: true,
        requestPath: "/chat/conversations/conversation-1/typing",
      });

      expect(chatRealtimeService.sendTypingIndicator).toHaveBeenCalledWith({
        companyId: "company-1",
        conversationId: "conversation-1",
        userId: "user-1",
        userIds: ["user-1", "user-2"],
        isTyping: true,
      });
      expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it("degrades safely when recipient lookup fails", async () => {
      prismaMock.$queryRaw.mockRejectedValueOnce(new Error("lookup failed"));

      await expect(
        ChatService.emitTypingIndicator({
          conversationId: "conversation-1",
          companyId: "company-1",
          userId: "user-1",
          isTyping: true,
          requestPath: "/chat/conversations/conversation-1/typing",
        }),
      ).resolves.toEqual({ success: true });

      expect(chatRealtimeService.sendTypingIndicator).toHaveBeenCalledWith({
        companyId: "company-1",
        conversationId: "conversation-1",
        userId: "user-1",
        userIds: ["user-1"],
        isTyping: true,
      });
    });

    it("degrades safely when realtime broadcast fails", async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([
        { user_id: "user-1" },
        { user_id: "user-2" },
      ]);
      (chatRealtimeService.sendTypingIndicator as jest.Mock).mockRejectedValueOnce(
        new Error("realtime failed"),
      );

      await expect(
        ChatService.emitTypingIndicator({
          conversationId: "conversation-1",
          companyId: "company-1",
          userId: "user-1",
          isTyping: false,
          requestPath: "/chat/conversations/conversation-1/typing",
        }),
      ).resolves.toEqual({ success: true });
    });
  });
});
