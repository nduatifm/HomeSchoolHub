-- CreateTable
CREATE TABLE IF NOT EXISTS "ThreadLabel" (
    "id" SERIAL NOT NULL,
    "teacherUserId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ThreadLabel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ThreadLabel_teacherUserId_studentId_key" ON "ThreadLabel"("teacherUserId", "studentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ThreadLabel_teacherUserId_idx" ON "ThreadLabel"("teacherUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ThreadLabel_studentId_idx" ON "ThreadLabel"("studentId");
