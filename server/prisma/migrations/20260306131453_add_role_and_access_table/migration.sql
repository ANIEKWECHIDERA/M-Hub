/*
  Warnings:

  - Added the required column `access` to the `company_invite` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `company_invite` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "company_invite" ADD COLUMN     "access" TEXT NOT NULL,
ADD COLUMN     "role" TEXT NOT NULL;
