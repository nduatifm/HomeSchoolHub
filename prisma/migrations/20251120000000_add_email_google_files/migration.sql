-- AlterTable: Add email verification fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isEmailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifyToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifyExpires" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profilePicture" TEXT;

-- AlterTable: Make password optional for OAuth users
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- Add file URL to Assignment
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;

-- Add meeting fields to Session
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "sessionDate" TEXT DEFAULT '';
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "meetingUrl" TEXT;

-- Rename date column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Session' AND column_name = 'date'
  ) THEN
    -- Copy data from old date column to sessionDate
    UPDATE "Session" SET "sessionDate" = "date" WHERE "sessionDate" = '' OR "sessionDate" IS NULL;
    -- Drop the old date column
    ALTER TABLE "Session" DROP COLUMN "date";
  END IF;
END $$;

-- Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "User_emailVerifyToken_key" ON "User"("emailVerifyToken");
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "User_googleId_idx" ON "User"("googleId");
CREATE INDEX IF NOT EXISTS "User_emailVerifyToken_idx" ON "User"("emailVerifyToken");
