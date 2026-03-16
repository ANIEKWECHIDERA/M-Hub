/*
  Warnings:

  - You are about to drop the column `token` on the `company_invite` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[token_hash]` on the table `company_invite` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "company_invite_token_key";

-- AlterTable
ALTER TABLE "company_invite" DROP COLUMN "token",
ADD COLUMN     "token_hash" TEXT;

-- CreateTable
CREATE TABLE "invite_otps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "invite_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "expires_at" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_invite_token_hash_key" ON "company_invite"("token_hash");
