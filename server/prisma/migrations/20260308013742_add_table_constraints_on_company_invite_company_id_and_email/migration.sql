/*
  Warnings:

  - A unique constraint covering the columns `[company_id]` on the table `company_invite` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `company_invite` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "company_invite_company_id_key" ON "company_invite"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_invite_email_key" ON "company_invite"("email");
