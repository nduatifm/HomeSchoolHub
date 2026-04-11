-- CreateTable
CREATE TABLE "ClassroomContentSeen" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" INTEGER NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomContentSeen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassroomContentSeen_userId_contentType_idx" ON "ClassroomContentSeen"("userId", "contentType");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomContentSeen_userId_contentType_contentId_key" ON "ClassroomContentSeen"("userId", "contentType", "contentId");

-- AddForeignKey
ALTER TABLE "ClassroomContentSeen" ADD CONSTRAINT "ClassroomContentSeen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
