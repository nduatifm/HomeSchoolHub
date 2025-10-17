-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "password" VARCHAR,
ADD COLUMN     "verification_token" VARCHAR,
ADD COLUMN     "verification_token_expiry" TIMESTAMP(3);
