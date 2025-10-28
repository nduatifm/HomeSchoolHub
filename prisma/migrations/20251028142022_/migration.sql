-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password_reset_token" VARCHAR,
ADD COLUMN     "password_reset_token_expiry" TIMESTAMP(3);
