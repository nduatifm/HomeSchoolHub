-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "gradeFolderId" INTEGER;

-- CreateTable
CREATE TABLE "GradeFolder" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "slug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GradeFolder_slug_key" ON "GradeFolder"("slug");

-- CreateIndex
CREATE INDEX "GradeFolder_teacherId_idx" ON "GradeFolder"("teacherId");

-- CreateIndex
CREATE INDEX "Classroom_gradeFolderId_idx" ON "Classroom"("gradeFolderId");

-- AddForeignKey
ALTER TABLE "GradeFolder" ADD CONSTRAINT "GradeFolder_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_gradeFolderId_fkey" FOREIGN KEY ("gradeFolderId") REFERENCES "GradeFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
