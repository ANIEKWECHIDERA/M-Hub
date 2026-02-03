/*
  Warnings:

  - You are about to drop the column `user_id` on the `subtasks` table. All the data in the column will be lost.
  - Added the required column `team_member_id` to the `subtasks` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "subtasks" DROP CONSTRAINT "subtasks_user_id_fkey";

-- AlterTable
ALTER TABLE "subtasks" DROP COLUMN "user_id",
ADD COLUMN     "team_member_id" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
