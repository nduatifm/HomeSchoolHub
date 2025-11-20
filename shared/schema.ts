import { z } from "zod";

// User roles
export const userRoles = ["teacher", "parent", "student"] as const;
export type UserRole = typeof userRoles[number];

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password: z.string().nullable(),
  name: z.string(),
  role: z.enum(userRoles).nullable(),
  isEmailVerified: z.boolean(),
  emailVerifyToken: z.string().nullable(),
  emailVerifyExpires: z.string().nullable(),
  googleId: z.string().nullable(),
  profilePicture: z.string().nullable(),
});

export const insertUserSchema = userSchema.omit({ id: true, isEmailVerified: true, emailVerifyToken: true, emailVerifyExpires: true });
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Auth validation schemas
export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["teacher", "parent"], { errorMap: () => ({ message: "Role must be teacher or parent" }) }),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const resendVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const studentSignupSchema = z.object({
  token: z.string().uuid("Invalid invite token format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type StudentSignupInput = z.infer<typeof studentSignupSchema>;

// Student schema
export const studentSchema = z.object({
  id: z.number(),
  userId: z.number(),
  parentId: z.number(),
  name: z.string(),
  gradeLevel: z.string(),
  badges: z.array(z.string()),
  points: z.number(),
});

export const insertStudentSchema = studentSchema.omit({ id: true });
export type Student = z.infer<typeof studentSchema>;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

// Assignment schema
export const assignmentSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  subject: z.string(),
  dueDate: z.string(),
  teacherId: z.number(),
  gradeLevel: z.string(),
  points: z.number(),
  fileUrl: z.string().nullable(),
});

export const insertAssignmentSchema = assignmentSchema.omit({ id: true });
export type Assignment = z.infer<typeof assignmentSchema>;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;

// Student Assignment schema
export const studentAssignmentSchema = z.object({
  id: z.number(),
  assignmentId: z.number(),
  studentId: z.number(),
  submission: z.string().nullable(),
  grade: z.number().nullable(),
  feedback: z.string().nullable(),
  status: z.enum(["pending", "submitted", "graded"]),
  submittedAt: z.string().nullable(),
});

export const insertStudentAssignmentSchema = studentAssignmentSchema.omit({ id: true });
export type StudentAssignment = z.infer<typeof studentAssignmentSchema>;
export type InsertStudentAssignment = z.infer<typeof insertStudentAssignmentSchema>;

// Study Material schema
export const materialSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  fileUrl: z.string(),
  subject: z.string(),
  teacherId: z.number(),
  uploadDate: z.string(),
  gradeLevel: z.string(),
});

export const insertMaterialSchema = materialSchema.omit({ id: true });
export type Material = z.infer<typeof materialSchema>;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;

// Schedule schema
export const scheduleSchema = z.object({
  id: z.number(),
  teacherId: z.number(),
  studentId: z.number(),
  dayOfWeek: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  subject: z.string(),
});

export const insertScheduleSchema = scheduleSchema.omit({ id: true });
export type Schedule = z.infer<typeof scheduleSchema>;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;

// Session schema
export const sessionSchema = z.object({
  id: z.number(),
  teacherId: z.number(),
  studentIds: z.array(z.number()),
  subject: z.string(),
  sessionDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  meetingUrl: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.enum(["scheduled", "completed", "cancelled"]),
});

export const insertSessionSchema = sessionSchema.omit({ id: true });
export type Session = z.infer<typeof sessionSchema>;
export type InsertSession = z.infer<typeof insertSessionSchema>;

// Feedback schema
export const feedbackSchema = z.object({
  id: z.number(),
  teacherId: z.number(),
  studentId: z.number(),
  message: z.string(),
  date: z.string(),
  type: z.enum(["positive", "constructive", "general"]),
});

export const insertFeedbackSchema = feedbackSchema.omit({ id: true });
export type Feedback = z.infer<typeof feedbackSchema>;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

// Attendance schema
export const attendanceSchema = z.object({
  id: z.number(),
  studentId: z.number(),
  sessionId: z.number().nullable(),
  date: z.string(),
  status: z.enum(["present", "absent", "late"]),
  notes: z.string().nullable(),
});

export const insertAttendanceSchema = attendanceSchema.omit({ id: true });
export type Attendance = z.infer<typeof attendanceSchema>;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

// Payment schema
export const paymentSchema = z.object({
  id: z.number(),
  parentId: z.number(),
  teacherId: z.number().nullable(),
  amount: z.number(),
  date: z.string(),
  status: z.enum(["pending", "completed", "failed"]),
  description: z.string(),
  subscriptionType: z.string().nullable(),
});

export const insertPaymentSchema = paymentSchema.omit({ id: true });
export type Payment = z.infer<typeof paymentSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// Tutor Request schema
export const tutorRequestSchema = z.object({
  id: z.number(),
  parentId: z.number(),
  teacherId: z.number(),
  studentId: z.number().nullable(),
  status: z.enum(["pending", "approved", "rejected"]),
  message: z.string(),
  requestDate: z.string(),
  responseDate: z.string().nullable(),
});

export const insertTutorRequestSchema = tutorRequestSchema.omit({ id: true });
export type TutorRequest = z.infer<typeof tutorRequestSchema>;
export type InsertTutorRequest = z.infer<typeof insertTutorRequestSchema>;

// Message schema
export const messageSchema = z.object({
  id: z.number(),
  senderId: z.number(),
  receiverId: z.number(),
  message: z.string(),
  timestamp: z.string(),
  isRead: z.boolean(),
});

export const insertMessageSchema = messageSchema.omit({ id: true });
export type Message = z.infer<typeof messageSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Progress Report schema
export const progressReportSchema = z.object({
  id: z.number(),
  studentId: z.number(),
  teacherId: z.number(),
  period: z.string(),
  content: z.string(),
  date: z.string(),
  grades: z.record(z.string(), z.number()),
});

export const insertProgressReportSchema = progressReportSchema.omit({ id: true });
export type ProgressReport = z.infer<typeof progressReportSchema>;
export type InsertProgressReport = z.infer<typeof insertProgressReportSchema>;

// Clarification schema
export const clarificationSchema = z.object({
  id: z.number(),
  studentId: z.number(),
  assignmentId: z.number(),
  question: z.string(),
  answer: z.string().nullable(),
  askedDate: z.string(),
  answeredDate: z.string().nullable(),
  status: z.enum(["pending", "answered"]),
});

export const insertClarificationSchema = clarificationSchema.omit({ id: true });
export type Clarification = z.infer<typeof clarificationSchema>;
export type InsertClarification = z.infer<typeof insertClarificationSchema>;

// Parental Control schema
export const parentalControlSchema = z.object({
  id: z.number(),
  studentId: z.number(),
  parentId: z.number(),
  screenTimeLimit: z.number().nullable(),
  allowedDays: z.array(z.string()),
  allowedTimes: z.object({
    start: z.string(),
    end: z.string(),
  }),
  blockedFeatures: z.array(z.string()),
});

export const insertParentalControlSchema = parentalControlSchema.omit({ id: true });
export type ParentalControl = z.infer<typeof parentalControlSchema>;
export type InsertParentalControl = z.infer<typeof insertParentalControlSchema>;

// Tutor Rating schema
export const tutorRatingSchema = z.object({
  id: z.number(),
  parentId: z.number(),
  teacherId: z.number(),
  rating: z.number(),
  review: z.string().nullable(),
  date: z.string(),
});

export const insertTutorRatingSchema = tutorRatingSchema.omit({ id: true });
export type TutorRating = z.infer<typeof tutorRatingSchema>;
export type InsertTutorRating = z.infer<typeof insertTutorRatingSchema>;

// Earnings schema
export const earningsSchema = z.object({
  id: z.number(),
  teacherId: z.number(),
  amount: z.number(),
  date: z.string(),
  source: z.string(),
  description: z.string(),
});

export const insertEarningsSchema = earningsSchema.omit({ id: true });
export type Earnings = z.infer<typeof earningsSchema>;
export type InsertEarnings = z.infer<typeof insertEarningsSchema>;

// Student Invite schema
export const studentInviteSchema = z.object({
  id: z.number(),
  parentId: z.number(),
  email: z.string().email(),
  studentName: z.string(),
  gradeLevel: z.string(),
  token: z.string(),
  status: z.enum(["pending", "accepted"]),
  createdDate: z.string(),
  expiresDate: z.string(),
});

export const insertStudentInviteSchema = studentInviteSchema.omit({ 
  id: true, 
  parentId: true, 
  token: true, 
  status: true, 
  createdDate: true, 
  expiresDate: true 
});
export type StudentInvite = z.infer<typeof studentInviteSchema>;
export type InsertStudentInvite = z.infer<typeof insertStudentInviteSchema>;
