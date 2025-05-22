import {
  pgTable,
  text,
  varchar,
  serial,
  integer,
  boolean,
  timestamp,
  json,
  jsonb,
  index,
  uuid,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User model
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("student"), // "parent", "student", "tutor"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Students table
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  parentId: varchar("parent_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStudentSchema = createInsertSchema(students).pick({
  userId: true,
  parentId: true,
});

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

// Subject model
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubjectSchema = createInsertSchema(subjects).pick({
  name: true,
  description: true,
});

export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjects.$inferSelect;

// Assignments model
export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  subjectId: integer("subject_id").references(() => subjects.id),
  tutorId: varchar("tutor_id").notNull().references(() => users.id),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAssignmentSchema = createInsertSchema(assignments).pick({
  title: true,
  description: true,
  subjectId: true,
  tutorId: true,
  dueDate: true,
});

export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignments.$inferSelect;

// Student assignments join table
export const studentAssignments = pgTable("student_assignments", {
  id: serial("id").primaryKey(),
  studentId: varchar("student_id").notNull().references(() => users.id),
  assignmentId: integer("assignment_id").references(() => assignments.id),
  status: varchar("status").default("assigned"), // "assigned", "in_progress", "completed", "overdue"
  submissionText: text("submission_text"),
  submissionUrl: varchar("submission_url"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    studentAssignmentIdx: uniqueIndex("student_assignment_idx").on(table.studentId, table.assignmentId),
  };
});

export const insertStudentAssignmentSchema = createInsertSchema(studentAssignments).pick({
  studentId: true,
  assignmentId: true,
  status: true,
  submissionText: true,
  submissionUrl: true,
  feedback: true,
});

export type InsertStudentAssignment = z.infer<typeof insertStudentAssignmentSchema>;
export type StudentAssignment = typeof studentAssignments.$inferSelect;

// Sessions model
export const tutoringSessions = pgTable("tutoring_sessions", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  subjectId: integer("subject_id").references(() => subjects.id),
  tutorId: varchar("tutor_id").notNull().references(() => users.id),
  studentId: varchar("student_id").notNull().references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  meetLink: varchar("meet_link"),
  status: varchar("status").default("scheduled"), // "scheduled", "completed", "cancelled"
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSessionSchema = createInsertSchema(tutoringSessions).pick({
  title: true,
  subjectId: true,
  tutorId: true,
  studentId: true,
  startTime: true,
  endTime: true,
  meetLink: true,
  status: true,
  notes: true,
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type TutoringSession = typeof tutoringSessions.$inferSelect;

// Session summaries model
export const sessionSummaries = pgTable("session_summaries", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => tutoringSessions.id),
  summary: text("summary"),
  keyConcepts: text("key_concepts").array(),
  homeworkAssigned: text("homework_assigned"),
  engagementLevel: integer("engagement_level"), // 1-5
  recordingUrl: varchar("recording_url"),
  aiGenerated: boolean("ai_generated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSessionSummarySchema = createInsertSchema(sessionSummaries).pick({
  sessionId: true,
  summary: true,
  keyConcepts: true,
  homeworkAssigned: true,
  engagementLevel: true,
  recordingUrl: true,
  aiGenerated: true,
});

export type InsertSessionSummary = z.infer<typeof insertSessionSummarySchema>;
export type SessionSummary = typeof sessionSummaries.$inferSelect;

// Messages model
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  senderId: true,
  receiverId: true,
  content: true,
  read: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Student progress model
export const studentProgress = pgTable("student_progress", {
  id: serial("id").primaryKey(),
  studentId: varchar("student_id").notNull().references(() => users.id),
  subjectId: integer("subject_id").references(() => subjects.id),
  week: integer("week").notNull(),
  totalWeeks: integer("total_weeks").notNull(),
  completionPercentage: integer("completion_percentage").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    studentSubjectIdx: uniqueIndex("student_subject_idx").on(table.studentId, table.subjectId),
  };
});

export const insertStudentProgressSchema = createInsertSchema(studentProgress).pick({
  studentId: true,
  subjectId: true,
  week: true,
  totalWeeks: true,
  completionPercentage: true,
});

export type InsertStudentProgress = z.infer<typeof insertStudentProgressSchema>;
export type StudentProgress = typeof studentProgress.$inferSelect;
