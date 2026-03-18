-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "direct_key" TEXT,
    "name" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_conversation_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "team_member_id" UUID NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_by" UUID,
    "removed_at" TIMESTAMP(3),
    "removed_by" UUID,
    "last_read_message_id" UUID,
    "last_read_at" TIMESTAMP(3),
    "notifications_muted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "chat_conversation_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "sender_team_member_id" UUID,
    "body" TEXT NOT NULL,
    "message_type" TEXT NOT NULL DEFAULT 'text',
    "edited_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reply_to_message_id" UUID,
    "metadata" JSONB,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "tag" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "chat_message_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message_edits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "previous_body" TEXT NOT NULL,
    "edited_by" UUID NOT NULL,
    "edited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_edits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_conversations_direct_key_key" ON "chat_conversations"("direct_key");
CREATE INDEX "chat_conversations_company_id_idx" ON "chat_conversations"("company_id");
CREATE INDEX "chat_conversations_company_id_type_idx" ON "chat_conversations"("company_id", "type");
CREATE INDEX "chat_conversations_company_id_last_message_at_idx" ON "chat_conversations"("company_id", "last_message_at" DESC);
CREATE INDEX "chat_conversations_created_by_idx" ON "chat_conversations"("created_by");

CREATE INDEX "chat_conversation_members_conversation_id_idx" ON "chat_conversation_members"("conversation_id");
CREATE INDEX "chat_conversation_members_conversation_id_removed_at_idx" ON "chat_conversation_members"("conversation_id", "removed_at");
CREATE INDEX "chat_conversation_members_user_id_removed_at_idx" ON "chat_conversation_members"("user_id", "removed_at");
CREATE INDEX "chat_conversation_members_team_member_id_removed_at_idx" ON "chat_conversation_members"("team_member_id", "removed_at");
CREATE INDEX "chat_conversation_members_last_read_message_id_idx" ON "chat_conversation_members"("last_read_message_id");
CREATE UNIQUE INDEX "chat_conversation_members_active_user_key" ON "chat_conversation_members"("conversation_id", "user_id") WHERE "removed_at" IS NULL;
CREATE UNIQUE INDEX "chat_conversation_members_active_team_member_key" ON "chat_conversation_members"("conversation_id", "team_member_id") WHERE "removed_at" IS NULL;

CREATE INDEX "chat_messages_conversation_id_idx" ON "chat_messages"("conversation_id");
CREATE INDEX "chat_messages_conversation_id_created_at_idx" ON "chat_messages"("conversation_id", "created_at" DESC, "id" DESC);
CREATE INDEX "chat_messages_company_id_created_at_idx" ON "chat_messages"("company_id", "created_at" DESC);
CREATE INDEX "chat_messages_sender_team_member_id_idx" ON "chat_messages"("sender_team_member_id");
CREATE INDEX "chat_messages_reply_to_message_id_idx" ON "chat_messages"("reply_to_message_id");

CREATE UNIQUE INDEX "chat_message_tags_message_id_tag_key" ON "chat_message_tags"("message_id", "tag");
CREATE INDEX "chat_message_tags_message_id_idx" ON "chat_message_tags"("message_id");
CREATE INDEX "chat_message_tags_tag_idx" ON "chat_message_tags"("tag");
CREATE INDEX "chat_message_tags_created_by_idx" ON "chat_message_tags"("created_by");

CREATE INDEX "chat_message_edits_message_id_edited_at_idx" ON "chat_message_edits"("message_id", "edited_at" DESC);
CREATE INDEX "chat_message_edits_edited_by_idx" ON "chat_message_edits"("edited_by");

-- AddForeignKey
ALTER TABLE "chat_conversations"
ADD CONSTRAINT "chat_conversations_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_conversations"
ADD CONSTRAINT "chat_conversations_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "chat_conversation_members"
ADD CONSTRAINT "chat_conversation_members_conversation_id_fkey"
FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_conversation_members"
ADD CONSTRAINT "chat_conversation_members_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_conversation_members"
ADD CONSTRAINT "chat_conversation_members_team_member_id_fkey"
FOREIGN KEY ("team_member_id") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_conversation_members"
ADD CONSTRAINT "chat_conversation_members_added_by_fkey"
FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "chat_conversation_members"
ADD CONSTRAINT "chat_conversation_members_removed_by_fkey"
FOREIGN KEY ("removed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "chat_messages"
ADD CONSTRAINT "chat_messages_conversation_id_fkey"
FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_messages"
ADD CONSTRAINT "chat_messages_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_messages"
ADD CONSTRAINT "chat_messages_sender_team_member_id_fkey"
FOREIGN KEY ("sender_team_member_id") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "chat_messages"
ADD CONSTRAINT "chat_messages_reply_to_message_id_fkey"
FOREIGN KEY ("reply_to_message_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "chat_conversation_members"
ADD CONSTRAINT "chat_conversation_members_last_read_message_id_fkey"
FOREIGN KEY ("last_read_message_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "chat_message_tags"
ADD CONSTRAINT "chat_message_tags_message_id_fkey"
FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_message_tags"
ADD CONSTRAINT "chat_message_tags_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_message_edits"
ADD CONSTRAINT "chat_message_edits_message_id_fkey"
FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_message_edits"
ADD CONSTRAINT "chat_message_edits_edited_by_fkey"
FOREIGN KEY ("edited_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add chat-specific check constraints
ALTER TABLE "chat_conversations"
ADD CONSTRAINT "chat_conversations_type_check"
CHECK ("type" IN ('direct', 'group'));

ALTER TABLE "chat_conversations"
ADD CONSTRAINT "chat_conversations_shape_check"
CHECK (
  ("type" = 'direct' AND "name" IS NULL AND "direct_key" IS NOT NULL)
  OR
  ("type" = 'group' AND "name" IS NOT NULL)
);

ALTER TABLE "chat_messages"
ADD CONSTRAINT "chat_messages_type_check"
CHECK ("message_type" IN ('text', 'system', 'tagged', 'file', 'image'));
