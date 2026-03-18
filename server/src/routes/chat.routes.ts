import { Router } from "express";
import { ChatController } from "../controllers/chat.controller";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";
import { authorize } from "../middleware/authorize";

const router = Router();
const protectedRoute = [verifyFirebaseToken, profileSync, requireAppUser];
router.get("/chat/stream", ChatController.streamChat);

router.get(
  "/chat/conversations",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member", "member"]),
  ChatController.listConversations,
);

router.get(
  "/chat/conversations/:conversationId",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member", "member"]),
  ChatController.getConversation,
);

router.get(
  "/chat/conversations/:conversationId/messages",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member", "member"]),
  ChatController.listMessages,
);

router.post(
  "/chat/conversations/direct",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member", "member"]),
  ChatController.createDirectConversation,
);

router.post(
  "/chat/conversations/group",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member", "member"]),
  ChatController.createGroupConversation,
);

router.post(
  "/chat/conversations/:conversationId/messages",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member", "member"]),
  ChatController.sendMessage,
);

router.post(
  "/chat/conversations/:conversationId/typing",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member", "member"]),
  ChatController.sendTypingIndicator,
);

router.post(
  "/chat/conversations/:conversationId/read",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member", "member"]),
  ChatController.markConversationRead,
);

router.patch(
  "/chat/conversations/:conversationId/preferences",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member", "member"]),
  ChatController.updateConversationPreferences,
);

router.patch(
  "/chat/messages/:messageId",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member", "member"]),
  ChatController.editMessage,
);

router.delete(
  "/chat/messages/:messageId",
  ...protectedRoute,
  authorize(["admin", "superAdmin", "team_member", "member"]),
  ChatController.deleteMessage,
);

router.post(
  "/chat/conversations/:conversationId/members",
  ...protectedRoute,
  authorize(["admin", "superAdmin"]),
  ChatController.addMembers,
);

router.delete(
  "/chat/conversations/:conversationId/members/:userId",
  ...protectedRoute,
  authorize(["admin", "superAdmin"]),
  ChatController.removeMember,
);

router.patch(
  "/chat/conversations/:conversationId",
  ...protectedRoute,
  authorize(["admin", "superAdmin"]),
  ChatController.renameGroup,
);

export default router;
