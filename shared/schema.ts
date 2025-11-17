import { z } from "zod";
import type { Prisma } from "@prisma/client";

// Export Prisma-generated types
export type User = Prisma.UserGetPayload<{}>;
export type Student = Prisma.StudentGetPayload<{}>;
export type Subject = Prisma.SubjectGetPayload<{}>;
export type Assignment = Prisma.AssignmentGetPayload<{}>;
export type StudentAssignment = Prisma.StudentAssignmentGetPayload<{}>;
export type TutoringSession = Prisma.TutoringSessionGetPayload<{}>;
export type SessionSummary = Prisma.SessionSummaryGetPayload<{}>;
export type Message = Prisma.MessageGetPayload<{}>;
export type StudentProgress = Prisma.StudentProgressGetPayload<{}>;
export type TutorRequest = Prisma.TutorRequestGetPayload<{}>;
export type Notification = Prisma.NotificationGetPayload<{}>;
export type LearningMaterial = Prisma.LearningMaterialGetPayload<{}>;

// UpsertUser type (for user creation/update)
export type UpsertUser = {
  id: string;
  email?: string | null;
  password?: string | null;
  emailVerified?: boolean;
  verificationToken?: string | null;
  verificationTokenExpiry?: Date | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  role?: string | null;
};

// Zod schemas for insert operations
export const insertStudentSchema = z.object({
  userId: z.string(),
  parentId: z.string().optional().nullable(),
});
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export const insertSubjectSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
});
export type InsertSubject = z.infer<typeof insertSubjectSchema>;

export const insertAssignmentSchema = z.object({
  title: z.string(),
  description: z.string().optional().nullable(),
  subjectId: z.number().optional().nullable(),
  tutorId: z.string(),
  dueDate: z.coerce.date().optional().nullable(),
});
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;

export const insertStudentAssignmentSchema = z.object({
  studentId: z.string(),
  assignmentId: z.number().optional().nullable(),
  status: z.string().optional().nullable(),
  submissionText: z.string().optional().nullable(),
  submissionUrl: z.string().optional().nullable(),
  feedback: z.string().optional().nullable(),
});
export type InsertStudentAssignment = z.infer<typeof insertStudentAssignmentSchema>;

export const insertSessionSchema = z.object({
  title: z.string(),
  subjectId: z.number().optional().nullable(),
  tutorId: z.string(),
  studentId: z.string(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  meetLink: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type InsertSession = z.infer<typeof insertSessionSchema>;

export const insertSessionSummarySchema = z.object({
  sessionId: z.number().optional().nullable(),
  summary: z.string().optional().nullable(),
  keyConcepts: z.array(z.string()),
  homeworkAssigned: z.string().optional().nullable(),
  engagementLevel: z.number().optional().nullable(),
  recordingUrl: z.string().optional().nullable(),
  aiGenerated: z.boolean().optional().nullable(),
});
export type InsertSessionSummary = z.infer<typeof insertSessionSummarySchema>;

export const insertMessageSchema = z.object({
  senderId: z.string(),
  receiverId: z.string(),
  content: z.string(),
  read: z.boolean().optional().nullable(),
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export const insertStudentProgressSchema = z.object({
  studentId: z.string(),
  subjectId: z.number().optional().nullable(),
  week: z.number(),
  totalWeeks: z.number(),
  completionPercentage: z.number().optional().nullable(),
});
export type InsertStudentProgress = z.infer<typeof insertStudentProgressSchema>;

export const insertTutorRequestSchema = z.object({
  parentId: z.string(),
  tutorId: z.string(),
  studentId: z.string().optional(),
  subjectId: z.number().optional(),
  message: z.string().optional(),
  status: z.string().optional(),
});
export type InsertTutorRequest = z.infer<typeof insertTutorRequestSchema>;

export const insertNotificationSchema = z.object({
  userId: z.string(),
  senderId: z.string().optional(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  link: z.string().optional(),
  read: z.boolean().optional(),
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export const insertLearningMaterialSchema = z.object({
  title: z.string(),
  description: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
  fileType: z.string().optional().nullable(),
  subjectId: z.number().optional().nullable(),
  tutorId: z.string(),
  studentIds: z.array(z.string()),
});
export type InsertLearningMaterial = z.infer<typeof insertLearningMaterialSchema>;
