/*
  Warnings:

  - Added the required column `company_id` to the `note_tags` table without a default value. This is not possible if the table is not empty.
  - Added the required column `company_id` to the `notifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "note_tags" ADD COLUMN     "company_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'private';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "company_id" UUID NOT NULL;
