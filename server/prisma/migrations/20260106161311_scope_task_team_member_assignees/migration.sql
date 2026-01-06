/*
  Warnings:

  - Added the required column `company_id` to the `project_team_members` table without a default value. This is not possible if the table is not empty.
  - Added the required column `company_id` to the `task_team_member_assignees` table without a default value. This is not possible if the table is not empty.
  - Added the required column `project_id` to the `task_team_member_assignees` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "project_team_members" ADD COLUMN     "company_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "task_team_member_assignees" ADD COLUMN     "company_id" UUID NOT NULL,
ADD COLUMN     "project_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "project_team_members_company_id_idx" ON "project_team_members"("company_id");

-- AddForeignKey
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
