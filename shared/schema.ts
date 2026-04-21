import { z } from "zod";

// User roles
export const userRoles = ["teacher", "parent", "student"] as const;
export type UserRole = (typeof userRoles)[number];

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  username: z.string().nullable(),
  password: z.string().nullable(),
  name: z.string(),
  role: z.enum(userRoles).nullable(),
  isEmailVerified: z.boolean(),
  emailVerifyToken: z.string().nullable(),
  emailVerifyExpires: z.string().nullable(),
  googleId: z.string().nullable(),
  profilePicture: z.string().nullable(),
  bio: z.string().nullable(),
  // Teacher-specific fields
  teachingSubjects: z.array(z.string()),
  yearsExperience: z.number().nullable(),
  qualifications: z.string().nullable(),
  specialization: z.string().nullable(),
  // Parent-specific fields
  phone: z.string().nullable(),
  preferredContact: z.string().nullable(),
  // Capabilities (all roles ever granted)
  roles: z.array(z.string()),
  // Admin flags
  isAdmin: z.boolean(),
  isSuperAdmin: z.boolean(),
  // Student-specific fields
  interests: z.array(z.string()),
  favoriteSubject: z.string().nullable(),
  learningGoals: z.string().nullable(),
  slug: z.string().nullable().optional(),
});

export const insertUserSchema = userSchema.omit({
  id: true,
  isEmailVerified: true,
  emailVerifyToken: true,
  emailVerifyExpires: true,
  isAdmin: true,
  isSuperAdmin: true,
});
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Auth validation schemas
export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["teacher", "parent"], {
    errorMap: () => ({ message: "Role must be teacher or parent" }),
  }),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const resendVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const studentSignupSchema = z.object({
  code: z.string().min(1, "Invite code is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const studentGoogleSignupSchema = z.object({
  code: z.string().min(1, "Invite code is required"),
  credential: z.string().min(1, "Google credential is required"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type StudentSignupInput = z.infer<typeof studentSignupSchema>;
export type StudentGoogleSignupInput = z.infer<typeof studentGoogleSignupSchema>;

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
  points: z.number().optional().default(0),
  fileUrl: z.string().nullable(),
  slug: z.string().nullable().optional(),
});

export const insertAssignmentSchema = assignmentSchema.omit({ id: true });
export const updateAssignmentSchema = assignmentSchema
  .omit({ id: true, teacherId: true, points: true })
  .partial();
export type Assignment = z.infer<typeof assignmentSchema>;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type UpdateAssignment = z.infer<typeof updateAssignmentSchema>;

// Student Assignment schema
export const studentAssignmentSchema = z.object({
  id: z.number(),
  assignmentId: z.number(),
  studentId: z.number(),
  submission: z.string().nullable(),
  fileUrl: z.string().nullable(),
  notes: z.string().nullable(),
  grade: z.number().nullable(),
  feedback: z.string().nullable(),
  status: z.enum(["pending", "submitted", "graded"]),
  submittedAt: z.string().nullable(),
});

export const insertStudentAssignmentSchema = studentAssignmentSchema.omit({
  id: true,
});
export type StudentAssignment = z.infer<typeof studentAssignmentSchema>;
export type InsertStudentAssignment = z.infer<
  typeof insertStudentAssignmentSchema
>;

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
  slug: z.string().nullable().optional(),
});

export const insertMaterialSchema = materialSchema.omit({ id: true });
export const updateMaterialSchema = materialSchema
  .omit({ id: true, teacherId: true, uploadDate: true })
  .partial();
export type Material = z.infer<typeof materialSchema>;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type UpdateMaterial = z.infer<typeof updateMaterialSchema>;

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
export const updateSessionSchema = sessionSchema
  .omit({ id: true, teacherId: true })
  .partial();
export type Session = z.infer<typeof sessionSchema>;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type UpdateSession = z.infer<typeof updateSessionSchema>;

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

// Enriched TutorRequest — returned by GET /api/tutor-requests/parent and /teacher
export const enrichedTutorRequestSchema = tutorRequestSchema.extend({
  teacherName: z.string(),
  teacherEmail: z.string(),
  parentName: z.string(),
  studentName: z.string().nullable(),
  studentGrade: z.string().nullable(),
});
export type EnrichedTutorRequest = z.infer<typeof enrichedTutorRequestSchema>;

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

export const insertProgressReportSchema = progressReportSchema.omit({
  id: true,
});
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

export const insertParentalControlSchema = parentalControlSchema.omit({
  id: true,
});
export type ParentalControl = z.infer<typeof parentalControlSchema>;
export type InsertParentalControl = z.infer<typeof insertParentalControlSchema>;

// Tutor Rating schema
export const tutorRatingSchema = z.object({
  id: z.number(),
  parentId: z.number(),
  teacherId: z.number().nullable(),
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
  code: z.string(),
  status: z.enum(["pending", "accepted"]),
  createdDate: z.string(),
  expiresDate: z.string(),
});

export const insertStudentInviteSchema = studentInviteSchema.omit({
  id: true,
  parentId: true,
  token: true,
  code: true,
  status: true,
  createdDate: true,
  expiresDate: true,
});
export type StudentInvite = z.infer<typeof studentInviteSchema>;
export type InsertStudentInvite = z.infer<typeof insertStudentInviteSchema>;

// Thread Label schema
export const threadLabelSchema = z.object({
  id: z.number(),
  teacherUserId: z.number(),
  studentId: z.number(),
  name: z.string().max(60),
});

export const insertThreadLabelSchema = threadLabelSchema.omit({ id: true });
export type ThreadLabel = z.infer<typeof threadLabelSchema>;
export type InsertThreadLabel = z.infer<typeof insertThreadLabelSchema>;

// System Settings schema
export const systemSettingsSchema = z.object({
  id: z.number(),
  key: z.string(),
  value: z.string(),
  description: z.string().nullable(),
});

export const insertSystemSettingsSchema = systemSettingsSchema.omit({
  id: true,
});
export type SystemSettings = z.infer<typeof systemSettingsSchema>;
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;

// ─── Classroom schemas ─────────────────────────────────────────────────────

export const gradeFolderSchema = z.object({
  id: z.number(),
  name: z.string(),
  teacherId: z.number(),
  slug: z.string().nullable().optional(),
  createdAt: z.string(),
  classrooms: z.array(z.object({
    id: z.number(),
    name: z.string(),
    subject: z.string(),
    description: z.string().nullable(),
    slug: z.string().nullable().optional(),
    status: z.enum(["active", "archived"]),
  })).optional(),
});
export const insertGradeFolderSchema = gradeFolderSchema.omit({ id: true, createdAt: true, classrooms: true });
export type GradeFolder = z.infer<typeof gradeFolderSchema>;
export type InsertGradeFolder = z.infer<typeof insertGradeFolderSchema>;

export const classroomSchema = z.object({
  id: z.number(),
  name: z.string(),
  subject: z.string(),
  description: z.string().nullable(),
  teacherId: z.number(),
  status: z.enum(["active", "archived"]),
  createdAt: z.string(),
  slug: z.string().nullable().optional(),
  teacherName: z.string().nullable().optional(),
  gradeFolderId: z.number().nullable().optional(),
  gradeFolderName: z.string().nullable().optional(),
  gradeFolder: z.object({ id: z.number(), name: z.string() }).nullable().optional(),
});
export const insertClassroomSchema = classroomSchema.omit({ id: true, createdAt: true, teacherName: true, gradeFolderName: true, gradeFolder: true });
export type Classroom = z.infer<typeof classroomSchema>;
export type InsertClassroom = z.infer<typeof insertClassroomSchema>;

export const classroomEnrollmentSchema = z.object({
  id: z.number(),
  classroomId: z.number(),
  studentId: z.number(),
  enrolledAt: z.string(),
});
export const insertClassroomEnrollmentSchema = classroomEnrollmentSchema.omit({ id: true, enrolledAt: true });
export type ClassroomEnrollment = z.infer<typeof classroomEnrollmentSchema>;
export type InsertClassroomEnrollment = z.infer<typeof insertClassroomEnrollmentSchema>;

export const classroomPostSchema = z.object({
  id: z.number(),
  classroomId: z.number(),
  authorId: z.number(),
  content: z.string(),
  createdAt: z.string(),
});
export const insertClassroomPostSchema = classroomPostSchema.omit({ id: true, createdAt: true });
export type ClassroomPost = z.infer<typeof classroomPostSchema>;
export type InsertClassroomPost = z.infer<typeof insertClassroomPostSchema>;

export const formQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(["short", "paragraph", "multiple_choice", "checkbox", "true_false"]),
  label: z.string(),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
});
export type FormQuestion = z.infer<typeof formQuestionSchema>;

export const classroomAssignmentSchema = z.object({
  id: z.number(),
  classroomId: z.number(),
  title: z.string(),
  description: z.string(),
  dueDate: z.string(),
  points: z.number(),
  fileUrl: z.string().nullable().optional(),
  linkUrl: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  formSchema: z.array(formQuestionSchema).nullable().optional(),
  answerKey: z.record(z.string(), z.union([z.string(), z.array(z.string())])).nullable().optional(),
  createdAt: z.string(),
});
export const insertClassroomAssignmentSchema = classroomAssignmentSchema.omit({ id: true, createdAt: true });
export type ClassroomAssignment = z.infer<typeof classroomAssignmentSchema>;
export type InsertClassroomAssignment = z.infer<typeof insertClassroomAssignmentSchema>;

export const classroomSubmissionSchema = z.object({
  id: z.number(),
  assignmentId: z.number(),
  studentId: z.number(),
  content: z.string().nullable(),
  fileUrl: z.string().nullable(),
  formAnswers: z.record(z.string(), z.union([z.string(), z.array(z.string())])).nullable().optional(),
  status: z.enum(["pending", "submitted", "graded", "late"]),
  submittedAt: z.string().nullable(),
  grade: z.number().nullable(),
  feedback: z.string().nullable(),
});
export const insertClassroomSubmissionSchema = classroomSubmissionSchema.omit({ id: true });
export type ClassroomSubmission = z.infer<typeof classroomSubmissionSchema>;
export type InsertClassroomSubmission = z.infer<typeof insertClassroomSubmissionSchema>;

export const classroomMaterialSchema = z.object({
  id: z.number(),
  classroomId: z.number(),
  title: z.string(),
  description: z.string(),
  url: z.string().nullable().optional(),
  attachments: z.array(z.string()).optional(),
  assignmentId: z.number().nullable().optional(),
  slug: z.string().nullable().optional(),
  uploadedAt: z.string(),
  linkedAssignment: z.object({ id: z.number(), title: z.string(), slug: z.string().nullable().optional() }).nullable().optional(),
});
export const insertClassroomMaterialSchema = classroomMaterialSchema.omit({ id: true, uploadedAt: true, linkedAssignment: true });
export type ClassroomMaterial = z.infer<typeof classroomMaterialSchema>;
export type InsertClassroomMaterial = z.infer<typeof insertClassroomMaterialSchema>;

// Teacher Assignment schema (for direct teacher-student assignments without request flow)
export const teacherStudentAssignmentSchema = z.object({
  id: z.number(),
  teacherId: z.number(),
  studentId: z.number(),
  assignedDate: z.string(),
  status: z.enum(["active", "inactive"]),
});

export const insertTeacherStudentAssignmentSchema =
  teacherStudentAssignmentSchema.omit({ id: true });
export type TeacherStudentAssignment = z.infer<
  typeof teacherStudentAssignmentSchema
>;
export type InsertTeacherStudentAssignment = z.infer<
  typeof insertTeacherStudentAssignmentSchema
>;
