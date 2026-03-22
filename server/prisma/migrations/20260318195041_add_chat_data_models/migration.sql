-- DropIndex
DROP INDEX "chat_conversations_company_id_last_message_at_idx";

-- DropIndex
DROP INDEX "chat_message_edits_message_id_edited_at_idx";

-- DropIndex
DROP INDEX "chat_messages_company_id_created_at_idx";

-- DropIndex
DROP INDEX "chat_messages_conversation_id_created_at_idx";

-- CreateIndex
CREATE INDEX "chat_conversations_company_id_last_message_at_idx" ON "chat_conversations"("company_id", "last_message_at");

-- CreateIndex
CREATE INDEX "chat_message_edits_message_id_edited_at_idx" ON "chat_message_edits"("message_id", "edited_at");

-- CreateIndex
CREATE INDEX "chat_messages_conversation_id_created_at_idx" ON "chat_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_messages_company_id_created_at_idx" ON "chat_messages"("company_id", "created_at");
