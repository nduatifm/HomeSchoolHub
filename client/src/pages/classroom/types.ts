import type { ClassroomPost, ClassroomSubmission, ClassroomEnrollment } from "@shared/schema";

export type PostWithAuthor = ClassroomPost & { authorName: string };
export type SubmissionWithName = ClassroomSubmission & { studentName: string };
export type EnrollmentWithStudent = ClassroomEnrollment & { student: { id: number; name: string; userId: number } };
