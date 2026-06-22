-- CreateTable
CREATE TABLE "PlannerTask" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'chore',
    "startDate" TEXT NOT NULL,
    "time" TEXT,
    "note" TEXT,
    "reward" TEXT,
    "repeat" TEXT NOT NULL DEFAULT 'once',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannerTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannerTaskCompletion" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannerTaskCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlannerTask_studentId_idx" ON "PlannerTask"("studentId");

-- CreateIndex
CREATE INDEX "PlannerTask_createdByUserId_idx" ON "PlannerTask"("createdByUserId");

-- CreateIndex
CREATE INDEX "PlannerTask_startDate_idx" ON "PlannerTask"("startDate");

-- CreateIndex
CREATE INDEX "PlannerTaskCompletion_studentId_date_idx" ON "PlannerTaskCompletion"("studentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PlannerTaskCompletion_taskId_date_studentId_key" ON "PlannerTaskCompletion"("taskId", "date", "studentId");

-- AddForeignKey
ALTER TABLE "PlannerTask" ADD CONSTRAINT "PlannerTask_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerTask" ADD CONSTRAINT "PlannerTask_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerTaskCompletion" ADD CONSTRAINT "PlannerTaskCompletion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PlannerTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerTaskCompletion" ADD CONSTRAINT "PlannerTaskCompletion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
