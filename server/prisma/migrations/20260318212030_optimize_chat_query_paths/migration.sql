-- DropIndex
DROP INDEX "chat_conversations_company_id_last_message_at_id_idx";

-- DropIndex
DROP INDEX "chat_messages_conversation_id_deleted_at_created_at_id_idx";

-- CreateIndex
CREATE INDEX "chat_conversations_company_id_last_message_at_id_idx" ON "chat_conversations"("company_id", "last_message_at", "id");

-- CreateIndex
CREATE INDEX "chat_messages_conversation_id_deleted_at_created_at_id_idx" ON "chat_messages"("conversation_id", "deleted_at", "created_at", "id");

-- RenameIndex
ALTER INDEX "chat_conversation_members_conversation_id_user_id_removed_at_la" RENAME TO "chat_conversation_members_conversation_id_user_id_removed_a_idx";

-- RenameIndex
ALTER INDEX "chat_conversation_members_user_id_removed_at_conversation_id_id" RENAME TO "chat_conversation_members_user_id_removed_at_conversation_i_idx";
