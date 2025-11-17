import { 
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
  type InsertStudentProgress,
  type TutorRequest,
  type InsertTutorRequest,
  type Notification,
  type InsertNotification,
  type LearningMaterial,
  type InsertLearningMaterial
} from "@shared/schema";
import { prisma } from "./prisma";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(userData: { email: string; password: string; firstName?: string; lastName?: string }): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  updateUserVerification(id: string, verified: boolean, verificationToken?: string | null, verificationTokenExpiry?: Date | null): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  updateUserPassword(id: string, password: string): Promise<User | undefined>;
  updateUserPasswordReset(id: string, resetToken: string | null, resetTokenExpiry: Date | null): Promise<User | undefined>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  deleteUnverifiedExpiredUsers(): Promise<number>;
  
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
  
  // Tutor request operations
  getTutorRequest(id: number): Promise<TutorRequest | undefined>;
  getTutorRequestsByParent(parentId: string): Promise<TutorRequest[]>;
  getTutorRequestsByTutor(tutorId: string): Promise<TutorRequest[]>;
  createTutorRequest(request: InsertTutorRequest): Promise<TutorRequest>;
  updateTutorRequestStatus(id: number, status: string): Promise<TutorRequest | undefined>;
  
  // Notification operations
  getNotification(id: number): Promise<Notification | undefined>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotificationsByUser(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<number>;
  
  // Learning material operations
  getLearningMaterial(id: number): Promise<LearningMaterial | undefined>;
  getLearningMaterialsByTutor(tutorId: string): Promise<LearningMaterial[]>;
  getLearningMaterialsByStudent(studentId: string): Promise<LearningMaterial[]>;
  createLearningMaterial(material: InsertLearningMaterial): Promise<LearningMaterial>;
  deleteLearningMaterial(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({
      where: { id }
    });
    return user ?? undefined;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    return user ?? undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const { id, ...updateData } = userData;
    const user = await prisma.user.upsert({
      where: { id },
      update: {
        ...updateData,
        updatedAt: new Date(),
      },
      create: userData,
    });
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const user = await prisma.user.update({
      where: { id },
      data: { role, updatedAt: new Date() }
    });
    return user ?? undefined;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await prisma.user.findMany({
      where: { role }
    });
  }

  async createUser(userData: { email: string; password: string; firstName?: string; lastName?: string }): Promise<User> {
    const { randomUUID } = await import('crypto');
    return await prisma.user.create({
      data: {
        id: randomUUID(),
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        emailVerified: false,
      }
    });
  }

  async updateUserVerification(id: string, verified: boolean, verificationToken?: string | null, verificationTokenExpiry?: Date | null): Promise<User | undefined> {
    const user = await prisma.user.update({
      where: { id },
      data: {
        emailVerified: verified,
        verificationToken: verificationToken,
        verificationTokenExpiry: verificationTokenExpiry,
        updatedAt: new Date()
      }
    });
    return user ?? undefined;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiry: {
          gte: new Date()
        }
      }
    });
    return user ?? undefined;
  }

  async updateUserPassword(id: string, password: string): Promise<User | undefined> {
    const user = await prisma.user.update({
      where: { id },
      data: {
        password,
        updatedAt: new Date()
      }
    });
    return user ?? undefined;
  }

  async updateUserPasswordReset(id: string, resetToken: string | null, resetTokenExpiry: Date | null): Promise<User | undefined> {
    const user = await prisma.user.update({
      where: { id },
      data: {
        passwordResetToken: resetToken,
        passwordResetTokenExpiry: resetTokenExpiry,
        updatedAt: new Date()
      }
    });
    return user ?? undefined;
  }

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetTokenExpiry: {
          gte: new Date()
        }
      }
    });
    return user ?? undefined;
  }

  async deleteUnverifiedExpiredUsers(): Promise<number> {
    const result = await prisma.user.deleteMany({
      where: {
        emailVerified: false,
        verificationTokenExpiry: {
          lt: new Date()
        },
        password: {
          not: null
        }
      }
    });
    return result.count;
  }

  // Student operations
  async getStudentsByParentId(parentId: string): Promise<User[]> {
    const studentRecords = await prisma.student.findMany({
      where: { parentId },
      include: { user: true }
    });
    
    return studentRecords.map(s => s.user);
  }

  async getStudentsByTutorId(tutorId: string): Promise<User[]> {
    const studentSessions = await prisma.tutoringSession.findMany({
      where: { tutorId },
      select: { studentId: true },
      distinct: ['studentId']
    });
    
    const studentIds = studentSessions.map(s => s.studentId);
    
    if (studentIds.length === 0) return [];
    
    return await prisma.user.findMany({
      where: { id: { in: studentIds } }
    });
  }

  // Subject operations
  async getSubject(id: number): Promise<Subject | undefined> {
    const subject = await prisma.subject.findUnique({
      where: { id }
    });
    return subject ?? undefined;
  }

  async getSubjects(): Promise<Subject[]> {
    return await prisma.subject.findMany();
  }

  async createSubject(subject: InsertSubject): Promise<Subject> {
    return await prisma.subject.create({
      data: subject
    });
  }

  // Assignment operations
  async getAssignment(id: number): Promise<Assignment | undefined> {
    const assignment = await prisma.assignment.findUnique({
      where: { id }
    });
    return assignment ?? undefined;
  }

  async getAssignmentsByTutor(tutorId: string): Promise<Assignment[]> {
    return await prisma.assignment.findMany({
      where: { tutorId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAssignmentsByStudent(studentId: string): Promise<StudentAssignment[]> {
    return await prisma.studentAssignment.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    return await prisma.assignment.create({
      data: assignment
    });
  }

  async assignToStudent(studentAssignment: InsertStudentAssignment): Promise<StudentAssignment> {
    return await prisma.studentAssignment.create({
      data: studentAssignment
    });
  }

  async updateStudentAssignment(id: number, studentAssignment: Partial<InsertStudentAssignment>): Promise<StudentAssignment | undefined> {
    const updated = await prisma.studentAssignment.update({
      where: { id },
      data: { ...studentAssignment, updatedAt: new Date() }
    });
    return updated ?? undefined;
  }

  // Session operations
  async getSession(id: number): Promise<TutoringSession | undefined> {
    const session = await prisma.tutoringSession.findUnique({
      where: { id }
    });
    return session ?? undefined;
  }

  async getSessionsByTutor(tutorId: string): Promise<TutoringSession[]> {
    return await prisma.tutoringSession.findMany({
      where: { tutorId },
      orderBy: { startTime: 'desc' }
    });
  }

  async getSessionsByStudent(studentId: string): Promise<TutoringSession[]> {
    return await prisma.tutoringSession.findMany({
      where: { studentId },
      orderBy: { startTime: 'desc' }
    });
  }

  async getUpcomingSessionsByTutor(tutorId: string): Promise<TutoringSession[]> {
    const now = new Date();
    return await prisma.tutoringSession.findMany({
      where: {
        tutorId,
        startTime: { gte: now }
      },
      orderBy: { startTime: 'asc' }
    });
  }

  async getUpcomingSessionsByStudent(studentId: string): Promise<TutoringSession[]> {
    const now = new Date();
    return await prisma.tutoringSession.findMany({
      where: {
        studentId,
        startTime: { gte: now }
      },
      orderBy: { startTime: 'asc' }
    });
  }

  async createSession(session: InsertSession): Promise<TutoringSession> {
    return await prisma.tutoringSession.create({
      data: session
    });
  }

  async updateSession(id: number, session: Partial<InsertSession>): Promise<TutoringSession | undefined> {
    const updated = await prisma.tutoringSession.update({
      where: { id },
      data: { ...session, updatedAt: new Date() }
    });
    return updated ?? undefined;
  }

  // Session summary operations
  async getSessionSummary(id: number): Promise<SessionSummary | undefined> {
    const summary = await prisma.sessionSummary.findUnique({
      where: { id }
    });
    return summary ?? undefined;
  }

  async getSessionSummaryBySessionId(sessionId: number): Promise<SessionSummary | undefined> {
    const summary = await prisma.sessionSummary.findFirst({
      where: { sessionId }
    });
    return summary ?? undefined;
  }

  async createSessionSummary(summary: InsertSessionSummary): Promise<SessionSummary> {
    return await prisma.sessionSummary.create({
      data: summary
    });
  }

  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    const message = await prisma.message.findUnique({
      where: { id }
    });
    return message ?? undefined;
  }

  async getMessagesByUser(userId: string): Promise<Message[]> {
    return await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    return await prisma.message.create({
      data: message
    });
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const message = await prisma.message.update({
      where: { id },
      data: { read: true, updatedAt: new Date() }
    });
    return message ?? undefined;
  }

  // Progress operations
  async getStudentProgress(studentId: string): Promise<StudentProgress[]> {
    return await prisma.studentProgress.findMany({
      where: { studentId }
    });
  }

  async updateStudentProgress(id: number, progress: Partial<InsertStudentProgress>): Promise<StudentProgress | undefined> {
    const updated = await prisma.studentProgress.update({
      where: { id },
      data: { ...progress, updatedAt: new Date() }
    });
    return updated ?? undefined;
  }

  async createStudentProgress(progress: InsertStudentProgress): Promise<StudentProgress> {
    return await prisma.studentProgress.create({
      data: progress
    });
  }

  // Tutor request operations
  async getTutorRequest(id: number): Promise<TutorRequest | undefined> {
    const request = await prisma.tutorRequest.findUnique({
      where: { id },
      include: {
        parent: true,
        tutor: true,
        subject: true
      }
    });
    return request ?? undefined;
  }

  async getTutorRequestsByParent(parentId: string): Promise<TutorRequest[]> {
    return await prisma.tutorRequest.findMany({
      where: { parentId },
      include: {
        tutor: true,
        subject: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getTutorRequestsByTutor(tutorId: string): Promise<TutorRequest[]> {
    return await prisma.tutorRequest.findMany({
      where: { tutorId },
      include: {
        parent: true,
        subject: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createTutorRequest(request: InsertTutorRequest): Promise<TutorRequest> {
    return await prisma.tutorRequest.create({
      data: request
    });
  }

  async updateTutorRequestStatus(id: number, status: string): Promise<TutorRequest | undefined> {
    const updated = await prisma.tutorRequest.update({
      where: { id },
      data: { status, updatedAt: new Date() }
    });
    return updated ?? undefined;
  }

  // Notification operations
  async getNotification(id: number): Promise<Notification | undefined> {
    const notification = await prisma.notification.findUnique({
      where: { id }
    });
    return notification ?? undefined;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getUnreadNotificationsByUser(userId: string): Promise<Notification[]> {
    return await prisma.notification.findMany({
      where: {
        userId,
        read: false
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    return await prisma.notification.create({
      data: notification
    });
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true }
    });
    return updated ?? undefined;
  }

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        read: false
      },
      data: { read: true }
    });
    return result.count;
  }

  // Learning material operations
  async getLearningMaterial(id: number): Promise<LearningMaterial | undefined> {
    const material = await prisma.learningMaterial.findUnique({
      where: { id },
      include: {
        subject: true,
        tutor: true
      }
    });
    return material ?? undefined;
  }

  async getLearningMaterialsByTutor(tutorId: string): Promise<LearningMaterial[]> {
    return await prisma.learningMaterial.findMany({
      where: { tutorId },
      include: {
        subject: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getLearningMaterialsByStudent(studentId: string): Promise<LearningMaterial[]> {
    return await prisma.learningMaterial.findMany({
      where: {
        studentIds: {
          has: studentId
        }
      },
      include: {
        subject: true,
        tutor: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createLearningMaterial(material: InsertLearningMaterial): Promise<LearningMaterial> {
    return await prisma.learningMaterial.create({
      data: material
    });
  }

  async deleteLearningMaterial(id: number): Promise<boolean> {
    try {
      await prisma.learningMaterial.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const storage = new DatabaseStorage();
