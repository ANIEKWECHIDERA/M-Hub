ALTER TABLE "user_settings"
ADD COLUMN IF NOT EXISTS "daily_focus_email_enabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "task_due_notification_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "milestone" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_due_notification_log_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "task_due_notification_log_task_user_milestone_key"
ON "task_due_notification_log"("task_id", "user_id", "milestone");

CREATE INDEX IF NOT EXISTS "task_due_notification_log_company_sent_idx"
ON "task_due_notification_log"("company_id", "sent_at" DESC);

ALTER TABLE "task_due_notification_log"
DROP CONSTRAINT IF EXISTS "task_due_notification_log_task_id_fkey";

ALTER TABLE "task_due_notification_log"
ADD CONSTRAINT "task_due_notification_log_task_id_fkey"
FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_due_notification_log"
DROP CONSTRAINT IF EXISTS "task_due_notification_log_user_id_fkey";

ALTER TABLE "task_due_notification_log"
ADD CONSTRAINT "task_due_notification_log_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_due_notification_log"
DROP CONSTRAINT IF EXISTS "task_due_notification_log_company_id_fkey";

ALTER TABLE "task_due_notification_log"
ADD CONSTRAINT "task_due_notification_log_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "daily_focus_email_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "focus_date" DATE NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_focus_email_log_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "daily_focus_email_log_user_date_key"
ON "daily_focus_email_log"("user_id", "focus_date");

CREATE INDEX IF NOT EXISTS "daily_focus_email_log_company_sent_idx"
ON "daily_focus_email_log"("company_id", "sent_at" DESC);

ALTER TABLE "daily_focus_email_log"
DROP CONSTRAINT IF EXISTS "daily_focus_email_log_user_id_fkey";

ALTER TABLE "daily_focus_email_log"
ADD CONSTRAINT "daily_focus_email_log_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "daily_focus_email_log"
DROP CONSTRAINT IF EXISTS "daily_focus_email_log_company_id_fkey";

ALTER TABLE "daily_focus_email_log"
ADD CONSTRAINT "daily_focus_email_log_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
