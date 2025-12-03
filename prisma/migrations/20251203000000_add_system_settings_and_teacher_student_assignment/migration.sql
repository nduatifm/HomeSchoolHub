-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherStudentAssignment" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "assignedDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "TeacherStudentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_key_key" ON "SystemSettings"("key");

-- CreateIndex
CREATE INDEX "SystemSettings_key_idx" ON "SystemSettings"("key");

-- CreateIndex
CREATE INDEX "TeacherStudentAssignment_teacherId_idx" ON "TeacherStudentAssignment"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherStudentAssignment_studentId_idx" ON "TeacherStudentAssignment"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherStudentAssignment_teacherId_studentId_key" ON "TeacherStudentAssignment"("teacherId", "studentId");

-- AddForeignKey
ALTER TABLE "TeacherStudentAssignment" ADD CONSTRAINT "TeacherStudentAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherStudentAssignment" ADD CONSTRAINT "TeacherStudentAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
