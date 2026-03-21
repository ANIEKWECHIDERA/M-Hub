ALTER TABLE "user_settings"
ADD COLUMN "email_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "task_assignment_notifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "project_update_notifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "comment_notifications" BOOLEAN NOT NULL DEFAULT true;
