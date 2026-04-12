CREATE TABLE IF NOT EXISTS "task_folders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_folders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "task_folders_project_name_key"
ON "task_folders"("project_id", "name");

CREATE INDEX IF NOT EXISTS "task_folders_company_project_idx"
ON "task_folders"("company_id", "project_id", "position", "created_at");

ALTER TABLE "task_folders"
DROP CONSTRAINT IF EXISTS "task_folders_company_id_fkey";

ALTER TABLE "task_folders"
ADD CONSTRAINT "task_folders_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_folders"
DROP CONSTRAINT IF EXISTS "task_folders_project_id_fkey";

ALTER TABLE "task_folders"
ADD CONSTRAINT "task_folders_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tasks"
ADD COLUMN IF NOT EXISTS "folder_id" UUID,
ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "tasks_company_project_archive_idx"
ON "tasks"("company_id", "project_id", "archived_at", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "tasks_folder_idx"
ON "tasks"("folder_id");

ALTER TABLE "tasks"
DROP CONSTRAINT IF EXISTS "tasks_folder_id_fkey";

ALTER TABLE "tasks"
ADD CONSTRAINT "tasks_folder_id_fkey"
FOREIGN KEY ("folder_id") REFERENCES "task_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
