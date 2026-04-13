-- Add formSchema to ClassroomAssignment and formAnswers to ClassroomSubmission
ALTER TABLE "ClassroomAssignment" ADD COLUMN "formSchema" JSONB;
ALTER TABLE "ClassroomSubmission" ADD COLUMN "formAnswers" JSONB;
