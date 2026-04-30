-- CreateTable: child_team_members (ChildTeamMember model)
CREATE TABLE "child_team_members" (
    "id" SERIAL NOT NULL,
    "childId" INTEGER NOT NULL,
    "parentId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "status" TEXT NOT NULL DEFAULT 'active',
    "invitedBy" INTEGER,
    "inviteToken" TEXT,
    "inviteEmail" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "child_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unique invite token)
CREATE UNIQUE INDEX "child_team_members_inviteToken_key" ON "child_team_members"("inviteToken");

-- CreateIndex (unique child+parent pair)
CREATE UNIQUE INDEX "child_team_members_childId_parentId_key" ON "child_team_members"("childId", "parentId");

-- CreateIndex
CREATE INDEX "child_team_members_childId_idx" ON "child_team_members"("childId");

-- CreateIndex
CREATE INDEX "child_team_members_parentId_idx" ON "child_team_members"("parentId");

-- CreateIndex
CREATE INDEX "child_team_members_inviteToken_idx" ON "child_team_members"("inviteToken");

-- AddForeignKey
ALTER TABLE "child_team_members" ADD CONSTRAINT "child_team_members_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_team_members" ADD CONSTRAINT "child_team_members_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_team_members" ADD CONSTRAINT "child_team_members_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: seed child_team_members from existing Student.parentId values
INSERT INTO "child_team_members" ("childId", "parentId", "role", "status", "invitedAt", "createdAt", "acceptedAt")
SELECT "id", "parentId", 'owner', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Student"
WHERE "parentId" IS NOT NULL;

-- DropIndex on Student.parentId
DROP INDEX IF EXISTS "Student_parentId_idx";

-- DropColumn parentId from Student
ALTER TABLE "Student" DROP COLUMN "parentId";
