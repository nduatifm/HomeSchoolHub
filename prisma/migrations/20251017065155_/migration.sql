-- CreateTable
CREATE TABLE "sessions" (
    "sid" VARCHAR NOT NULL,
    "sess" JSONB NOT NULL,
    "expire" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR NOT NULL,
    "email" VARCHAR,
    "first_name" VARCHAR,
    "last_name" VARCHAR,
    "profile_image_url" VARCHAR,
    "role" VARCHAR,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "parent_id" VARCHAR,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR NOT NULL,
    "description" TEXT,
    "subject_id" INTEGER,
    "tutor_id" VARCHAR NOT NULL,
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_assignments" (
    "id" SERIAL NOT NULL,
    "student_id" VARCHAR NOT NULL,
    "assignment_id" INTEGER,
    "status" VARCHAR DEFAULT 'assigned',
    "submission_text" TEXT,
    "submission_url" VARCHAR,
    "feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutoring_sessions" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR NOT NULL,
    "subject_id" INTEGER,
    "tutor_id" VARCHAR NOT NULL,
    "student_id" VARCHAR NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "meet_link" VARCHAR,
    "status" VARCHAR DEFAULT 'scheduled',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutoring_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_summaries" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER,
    "summary" TEXT,
    "key_concepts" TEXT[],
    "homework_assigned" TEXT,
    "engagement_level" INTEGER,
    "recording_url" VARCHAR,
    "ai_generated" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "sender_id" VARCHAR NOT NULL,
    "receiver_id" VARCHAR NOT NULL,
    "content" TEXT NOT NULL,
    "read" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_progress" (
    "id" SERIAL NOT NULL,
    "student_id" VARCHAR NOT NULL,
    "subject_id" INTEGER,
    "week" INTEGER NOT NULL,
    "total_weeks" INTEGER NOT NULL,
    "completion_percentage" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IDX_session_expire" ON "sessions"("expire");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "student_assignments_student_id_assignment_id_key" ON "student_assignments"("student_id", "assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_progress_student_id_subject_id_key" ON "student_progress"("student_id", "subject_id");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_assignments" ADD CONSTRAINT "student_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_assignments" ADD CONSTRAINT "student_assignments_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutoring_sessions" ADD CONSTRAINT "tutoring_sessions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutoring_sessions" ADD CONSTRAINT "tutoring_sessions_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutoring_sessions" ADD CONSTRAINT "tutoring_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_summaries" ADD CONSTRAINT "session_summaries_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "tutoring_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
