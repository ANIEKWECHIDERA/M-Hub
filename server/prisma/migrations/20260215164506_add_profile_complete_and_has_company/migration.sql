-- AlterTable
ALTER TABLE "users" ADD COLUMN     "has_company" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profile_complete" BOOLEAN NOT NULL DEFAULT false;
