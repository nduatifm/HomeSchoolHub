-- CreateTable
CREATE TABLE "GradingPolicy" (
    "id" SERIAL NOT NULL,
    "classroomId" INTEGER NOT NULL,
    "assignmentWeight" INTEGER NOT NULL DEFAULT 25,
    "testWeight" INTEGER NOT NULL DEFAULT 25,
    "quizWeight" INTEGER NOT NULL DEFAULT 25,
    "projectWeight" INTEGER NOT NULL DEFAULT 25,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradingPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GradingPolicy_classroomId_idx" ON "GradingPolicy"("classroomId");

-- AddForeignKey
ALTER TABLE "GradingPolicy" ADD CONSTRAINT "GradingPolicy_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
