/*
  Warnings:

  - A unique constraint covering the columns `[company_id,email]` on the table `company_invite` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "company_invite_company_id_key";

-- DropIndex
DROP INDEX "company_invite_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "company_invite_company_id_email_key" ON "company_invite"("company_id", "email");
