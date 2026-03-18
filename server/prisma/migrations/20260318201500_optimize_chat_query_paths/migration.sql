-- Conversation ordering and keyset pagination support
CREATE INDEX IF NOT EXISTS "chat_conversations_company_id_last_message_at_id_idx"
ON "chat_conversations"("company_id", "last_message_at" DESC, "id" DESC);

-- Membership lookup and unread/read cursor support
CREATE INDEX IF NOT EXISTS "chat_conversation_members_user_id_removed_at_conversation_id_idx"
ON "chat_conversation_members"("user_id", "removed_at", "conversation_id");

CREATE INDEX IF NOT EXISTS "chat_conversation_members_conversation_id_user_id_removed_at_last_read_at_idx"
ON "chat_conversation_members"("conversation_id", "user_id", "removed_at", "last_read_at");

-- Message timeline and unread-count query support
CREATE INDEX IF NOT EXISTS "chat_messages_conversation_id_deleted_at_created_at_id_idx"
ON "chat_messages"("conversation_id", "deleted_at", "created_at" DESC, "id" DESC);
