ALTER TABLE "tasks"
DROP CONSTRAINT IF EXISTS "tasks_folder_id_fkey";

DROP INDEX IF EXISTS "tasks_folder_idx";

ALTER TABLE "tasks"
DROP COLUMN IF EXISTS "folder_id";

DROP TABLE IF EXISTS "task_folders";
