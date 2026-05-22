-- CreateTable
CREATE TABLE "submission_drafts" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "classroomId" INTEGER NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "formAnswers" JSONB,
    "savedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_drafts" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "classroomId" INTEGER NOT NULL,
    "assignmentId" INTEGER,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "dueDate" TEXT NOT NULL DEFAULT '',
    "points" INTEGER NOT NULL DEFAULT 100,
    "assignmentType" TEXT NOT NULL DEFAULT '',
    "linkUrl" TEXT,
    "formSchema" JSONB,
    "answerKey" JSONB,
    "linkedMaterialIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "savedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submission_drafts_studentId_idx" ON "submission_drafts"("studentId");

-- CreateIndex
CREATE INDEX "submission_drafts_assignmentId_idx" ON "submission_drafts"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "submission_drafts_studentId_assignmentId_key" ON "submission_drafts"("studentId", "assignmentId");

-- CreateIndex
CREATE INDEX "assignment_drafts_teacherId_idx" ON "assignment_drafts"("teacherId");

-- CreateIndex
CREATE INDEX "assignment_drafts_classroomId_idx" ON "assignment_drafts"("classroomId");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_drafts_teacherId_classroomId_assignmentId_key" ON "assignment_drafts"("teacherId", "classroomId", "assignmentId");

-- AddForeignKey
ALTER TABLE "submission_drafts" ADD CONSTRAINT "submission_drafts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_drafts" ADD CONSTRAINT "submission_drafts_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ClassroomAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_drafts" ADD CONSTRAINT "submission_drafts_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_drafts" ADD CONSTRAINT "assignment_drafts_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_drafts" ADD CONSTRAINT "assignment_drafts_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
