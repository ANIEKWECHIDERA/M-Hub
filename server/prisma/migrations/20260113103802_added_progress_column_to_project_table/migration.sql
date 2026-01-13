/*
  Warnings:

  - You are about to drop the column `progress` on the `tasks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "progress" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "progress";
