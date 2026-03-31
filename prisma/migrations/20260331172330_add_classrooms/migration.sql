-- CreateTable
CREATE TABLE "Classroom" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "teacherId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomEnrollment" (
    "id" SERIAL NOT NULL,
    "classroomId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomPost" (
    "id" SERIAL NOT NULL,
    "classroomId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomAssignment" (
    "id" SERIAL NOT NULL,
    "classroomId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomSubmission" (
    "id" SERIAL NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "content" TEXT,
    "fileUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submittedAt" TEXT,
    "grade" INTEGER,
    "feedback" TEXT,

    CONSTRAINT "ClassroomSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomMaterial" (
    "id" SERIAL NOT NULL,
    "classroomId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Classroom_teacherId_idx" ON "Classroom"("teacherId");

-- CreateIndex
CREATE INDEX "ClassroomEnrollment_classroomId_idx" ON "ClassroomEnrollment"("classroomId");

-- CreateIndex
CREATE INDEX "ClassroomEnrollment_studentId_idx" ON "ClassroomEnrollment"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomEnrollment_classroomId_studentId_key" ON "ClassroomEnrollment"("classroomId", "studentId");

-- CreateIndex
CREATE INDEX "ClassroomPost_classroomId_idx" ON "ClassroomPost"("classroomId");

-- CreateIndex
CREATE INDEX "ClassroomPost_authorId_idx" ON "ClassroomPost"("authorId");

-- CreateIndex
CREATE INDEX "ClassroomAssignment_classroomId_idx" ON "ClassroomAssignment"("classroomId");

-- CreateIndex
CREATE INDEX "ClassroomSubmission_assignmentId_idx" ON "ClassroomSubmission"("assignmentId");

-- CreateIndex
CREATE INDEX "ClassroomSubmission_studentId_idx" ON "ClassroomSubmission"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomSubmission_assignmentId_studentId_key" ON "ClassroomSubmission"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "ClassroomMaterial_classroomId_idx" ON "ClassroomMaterial"("classroomId");

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomEnrollment" ADD CONSTRAINT "ClassroomEnrollment_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomEnrollment" ADD CONSTRAINT "ClassroomEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomPost" ADD CONSTRAINT "ClassroomPost_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomPost" ADD CONSTRAINT "ClassroomPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomAssignment" ADD CONSTRAINT "ClassroomAssignment_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomSubmission" ADD CONSTRAINT "ClassroomSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ClassroomAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomSubmission" ADD CONSTRAINT "ClassroomSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomMaterial" ADD CONSTRAINT "ClassroomMaterial_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
