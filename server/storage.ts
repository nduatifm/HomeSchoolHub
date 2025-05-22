import { 
  users, 
  students, 
  subjects, 
  assignments, 
  studentAssignments, 
  tutoringSessions, 
  sessionSummaries, 
  messages, 
  studentProgress,
  type User, 
  type UpsertUser, 
  type Subject, 
  type InsertSubject, 
  type Assignment, 
  type InsertAssignment, 
  type StudentAssignment, 
  type InsertStudentAssignment, 
  type TutoringSession, 
  type InsertSession, 
  type SessionSummary, 
  type InsertSessionSummary, 
  type Message, 
  type InsertMessage, 
  type StudentProgress, 
  type InsertStudentProgress
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql, like, or } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  
  // Student operations
  getStudentsByParentId(parentId: string): Promise<User[]>;
  getStudentsByTutorId(tutorId: string): Promise<User[]>;
  
  // Subject operations
  getSubject(id: number): Promise<Subject | undefined>;
  getSubjects(): Promise<Subject[]>;
  createSubject(subject: InsertSubject): Promise<Subject>;
  
  // Assignment operations
  getAssignment(id: number): Promise<Assignment | undefined>;
  getAssignmentsByTutor(tutorId: string): Promise<Assignment[]>;
  getAssignmentsByStudent(studentId: string): Promise<StudentAssignment[]>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  assignToStudent(studentAssignment: InsertStudentAssignment): Promise<StudentAssignment>;
  updateStudentAssignment(id: number, studentAssignment: Partial<InsertStudentAssignment>): Promise<StudentAssignment | undefined>;
  
  // Session operations
  getSession(id: number): Promise<TutoringSession | undefined>;
  getSessionsByTutor(tutorId: string): Promise<TutoringSession[]>;
  getSessionsByStudent(studentId: string): Promise<TutoringSession[]>;
  getUpcomingSessionsByTutor(tutorId: string): Promise<TutoringSession[]>;
  getUpcomingSessionsByStudent(studentId: string): Promise<TutoringSession[]>;
  createSession(session: InsertSession): Promise<TutoringSession>;
  updateSession(id: number, session: Partial<InsertSession>): Promise<TutoringSession | undefined>;
  
  // Session summary operations
  getSessionSummary(id: number): Promise<SessionSummary | undefined>;
  getSessionSummaryBySessionId(sessionId: number): Promise<SessionSummary | undefined>;
  createSessionSummary(summary: InsertSessionSummary): Promise<SessionSummary>;
  
  // Message operations
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByUser(userId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<Message | undefined>;
  
  // Progress operations
  getStudentProgress(studentId: string): Promise<StudentProgress[]>;
  updateStudentProgress(id: number, progress: Partial<InsertStudentProgress>): Promise<StudentProgress | undefined>;
  createStudentProgress(progress: InsertStudentProgress): Promise<StudentProgress>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  // Student operations
  async getStudentsByParentId(parentId: string): Promise<User[]> {
    const studentRecords = await db
      .select()
      .from(students)
      .where(eq(students.parentId, parentId));
    
    const studentIds = studentRecords.map(s => s.userId);
    
    if (studentIds.length === 0) return [];
    
    return await db
      .select()
      .from(users)
      .where(
        sql`${users.id} IN (${studentIds.join(', ')})`
      );
  }

  async getStudentsByTutorId(tutorId: string): Promise<User[]> {
    // Find all unique student IDs from sessions with this tutor
    const studentSessions = await db
      .select()
      .from(tutoringSessions)
      .where(eq(tutoringSessions.tutorId, tutorId));
    
    const studentIds = [...new Set(studentSessions.map(s => s.studentId))];
    
    if (studentIds.length === 0) return [];
    
    // Get the user details for each student
    return await db
      .select()
      .from(users)
      .where(
        sql`${users.id} IN (${studentIds.join(', ')})`
      );
  }

  // Subject operations
  async getSubject(id: number): Promise<Subject | undefined> {
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, id));
    return subject;
  }

  async getSubjects(): Promise<Subject[]> {
    return await db.select().from(subjects);
  }

  async createSubject(subject: InsertSubject): Promise<Subject> {
    const [newSubject] = await db
      .insert(subjects)
      .values(subject)
      .returning();
    return newSubject;
  }

  // Assignment operations
  async getAssignment(id: number): Promise<Assignment | undefined> {
    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
    return assignment;
  }

  async getAssignmentsByTutor(tutorId: string): Promise<Assignment[]> {
    return await db
      .select()
      .from(assignments)
      .where(eq(assignments.tutorId, tutorId))
      .orderBy(desc(assignments.createdAt));
  }

  async getAssignmentsByStudent(studentId: string): Promise<StudentAssignment[]> {
    return await db
      .select()
      .from(studentAssignments)
      .where(eq(studentAssignments.studentId, studentId))
      .orderBy(desc(studentAssignments.createdAt));
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const [newAssignment] = await db
      .insert(assignments)
      .values(assignment)
      .returning();
    return newAssignment;
  }

  async assignToStudent(studentAssignment: InsertStudentAssignment): Promise<StudentAssignment> {
    const [newStudentAssignment] = await db
      .insert(studentAssignments)
      .values(studentAssignment)
      .returning();
    return newStudentAssignment;
  }

  async updateStudentAssignment(id: number, studentAssignment: Partial<InsertStudentAssignment>): Promise<StudentAssignment | undefined> {
    const [updatedAssignment] = await db
      .update(studentAssignments)
      .set({ ...studentAssignment, updatedAt: new Date() })
      .where(eq(studentAssignments.id, id))
      .returning();
    return updatedAssignment;
  }

  // Session operations
  async getSession(id: number): Promise<TutoringSession | undefined> {
    const [session] = await db.select().from(tutoringSessions).where(eq(tutoringSessions.id, id));
    return session;
  }

  async getSessionsByTutor(tutorId: string): Promise<TutoringSession[]> {
    return await db
      .select()
      .from(tutoringSessions)
      .where(eq(tutoringSessions.tutorId, tutorId))
      .orderBy(desc(tutoringSessions.startTime));
  }

  async getSessionsByStudent(studentId: string): Promise<TutoringSession[]> {
    return await db
      .select()
      .from(tutoringSessions)
      .where(eq(tutoringSessions.studentId, studentId))
      .orderBy(desc(tutoringSessions.startTime));
  }

  async getUpcomingSessionsByTutor(tutorId: string): Promise<TutoringSession[]> {
    const now = new Date();
    return await db
      .select()
      .from(tutoringSessions)
      .where(
        and(
          eq(tutoringSessions.tutorId, tutorId),
          gte(tutoringSessions.startTime, now)
        )
      )
      .orderBy(tutoringSessions.startTime);
  }

  async getUpcomingSessionsByStudent(studentId: string): Promise<TutoringSession[]> {
    const now = new Date();
    return await db
      .select()
      .from(tutoringSessions)
      .where(
        and(
          eq(tutoringSessions.studentId, studentId),
          gte(tutoringSessions.startTime, now)
        )
      )
      .orderBy(tutoringSessions.startTime);
  }

  async createSession(session: InsertSession): Promise<TutoringSession> {
    const [newSession] = await db
      .insert(tutoringSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async updateSession(id: number, session: Partial<InsertSession>): Promise<TutoringSession | undefined> {
    const [updatedSession] = await db
      .update(tutoringSessions)
      .set({ ...session, updatedAt: new Date() })
      .where(eq(tutoringSessions.id, id))
      .returning();
    return updatedSession;
  }

  // Session summary operations
  async getSessionSummary(id: number): Promise<SessionSummary | undefined> {
    const [summary] = await db.select().from(sessionSummaries).where(eq(sessionSummaries.id, id));
    return summary;
  }

  async getSessionSummaryBySessionId(sessionId: number): Promise<SessionSummary | undefined> {
    const [summary] = await db.select().from(sessionSummaries).where(eq(sessionSummaries.sessionId, sessionId));
    return summary;
  }

  async createSessionSummary(summary: InsertSessionSummary): Promise<SessionSummary> {
    const [newSummary] = await db
      .insert(sessionSummaries)
      .values(summary)
      .returning();
    return newSummary;
  }

  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async getMessagesByUser(userId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          eq(messages.senderId, userId),
          eq(messages.receiverId, userId)
        )
      )
      .orderBy(desc(messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const [message] = await db
      .update(messages)
      .set({ read: true, updatedAt: new Date() })
      .where(eq(messages.id, id))
      .returning();
    return message;
  }

  // Progress operations
  async getStudentProgress(studentId: string): Promise<StudentProgress[]> {
    return await db
      .select()
      .from(studentProgress)
      .where(eq(studentProgress.studentId, studentId));
  }

  async updateStudentProgress(id: number, progress: Partial<InsertStudentProgress>): Promise<StudentProgress | undefined> {
    const [updatedProgress] = await db
      .update(studentProgress)
      .set({ ...progress, updatedAt: new Date() })
      .where(eq(studentProgress.id, id))
      .returning();
    return updatedProgress;
  }

  async createStudentProgress(progress: InsertStudentProgress): Promise<StudentProgress> {
    const [newProgress] = await db
      .insert(studentProgress)
      .values(progress)
      .returning();
    return newProgress;
  }
}

export const storage = new DatabaseStorage();
