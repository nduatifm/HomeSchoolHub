import prisma from "./db";
import { Prisma } from "@prisma/client";
import type {
  User,
  InsertUser,
  Student,
  InsertStudent,
  Assignment,
  InsertAssignment,
  StudentAssignment,
  InsertStudentAssignment,
  Material,
  InsertMaterial,
  Schedule,
  InsertSchedule,
  Session,
  InsertSession,
  Feedback,
  InsertFeedback,
  Attendance,
  InsertAttendance,
  Payment,
  InsertPayment,
  TutorRequest,
  InsertTutorRequest,
  Message,
  InsertMessage,
  ProgressReport,
  InsertProgressReport,
  Clarification,
  InsertClarification,
  ParentalControl,
  InsertParentalControl,
  TutorRating,
  InsertTutorRating,
  Earnings,
  InsertEarnings,
  StudentInvite,
  InsertStudentInvite,
  SystemSettings,
  InsertSystemSettings,
  TeacherStudentAssignment,
  InsertTeacherStudentAssignment,
} from "@shared/schema";

export type ConversationSummary = {
  studentId: number;
  teacherUserId: number;
  studentName: string;
  teacherName: string;
  parentName: string | null;
  lastMessage: string | null;
  lastMessageTimestamp: string | null;
  unreadCount: number;
};

export interface IStorage {
  createUser(user: Prisma.UserCreateInput): Promise<User>;
  getUserById(id: number): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserByEmailVerifyToken(token: string): Promise<User | null>;
  getUserByGoogleId(googleId: string): Promise<User | null>;
  updateUser(id: number, user: Prisma.UserUpdateInput): Promise<User>;

  createStudent(student: InsertStudent): Promise<Student>;
  getStudentById(id: number): Promise<Student | null>;
  getStudentByUserId(userId: number): Promise<Student | null>;
  getStudentsByParent(
    parentId: number,
  ): Promise<(Student & { email?: string })[]>;
  getStudentsByTeacher(
    teacherId: number,
  ): Promise<(Student & { email?: string })[]>;
  updateStudent(
    id: number,
    student: Prisma.StudentUpdateInput,
  ): Promise<Student>;

  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  getAssignmentById(id: number): Promise<Assignment | null>;
  getAssignmentsByTeacher(teacherId: number): Promise<Assignment[]>;
  getAssignmentsByGradeLevel(gradeLevel: string): Promise<Assignment[]>;
  getAllAssignments(): Promise<Assignment[]>;
  updateAssignment(id: number, assignment: any): Promise<Assignment>;
  deleteAssignment(id: number): Promise<void>;

  createStudentAssignment(
    studentAssignment: InsertStudentAssignment,
  ): Promise<StudentAssignment>;
  getStudentAssignmentById(id: number): Promise<StudentAssignment | null>;
  getStudentAssignmentsByStudent(
    studentId: number,
  ): Promise<StudentAssignment[]>;
  getStudentAssignmentsByAssignment(
    assignmentId: number,
  ): Promise<StudentAssignment[]>;
  updateStudentAssignment(
    id: number,
    studentAssignment: Prisma.StudentAssignmentUpdateInput,
  ): Promise<StudentAssignment>;

  createMaterial(material: InsertMaterial): Promise<Material>;
  getMaterialById(id: number): Promise<Material | null>;
  getMaterialsByTeacher(teacherId: number): Promise<Material[]>;
  getMaterialsBySubject(subject: string): Promise<Material[]>;
  getMaterialsByGradeLevel(gradeLevel: string): Promise<Material[]>;
  getAllMaterials(): Promise<Material[]>;
  getAllTeachers(): Promise<User[]>;
  updateMaterial(
    id: number,
    material: Partial<InsertMaterial>,
  ): Promise<Material>;
  deleteMaterial(id: number): Promise<void>;

  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  getSchedulesByTeacher(teacherId: number): Promise<Schedule[]>;
  getSchedulesByStudent(studentId: number): Promise<Schedule[]>;
  updateSchedule(
    id: number,
    schedule: Prisma.ScheduleUpdateInput,
  ): Promise<Schedule>;
  deleteSchedule(id: number): Promise<void>;

  createSession(session: Prisma.SessionCreateInput): Promise<Session>;
  getSessionById(id: number): Promise<Session | null>;
  getSessionsByTeacher(teacherId: number): Promise<Session[]>;
  getSessionsByStudent(studentId: number): Promise<Session[]>;
  getAllSessions(): Promise<Session[]>;
  updateSession(id: number, session: any): Promise<Session>;
  deleteSession(id: number): Promise<void>;

  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getFeedbackByStudent(studentId: number): Promise<Feedback[]>;
  getFeedbackByTeacher(teacherId: number): Promise<Feedback[]>;

  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  getAttendanceByStudent(studentId: number): Promise<Attendance[]>;
  getAttendanceBySession(sessionId: number): Promise<Attendance[]>;
  updateAttendance(
    id: number,
    attendance: Prisma.AttendanceUpdateInput,
  ): Promise<Attendance>;

  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByParent(parentId: number): Promise<Payment[]>;
  getPaymentsByTeacher(teacherId: number): Promise<Payment[]>;
  updatePayment(
    id: number,
    payment: Prisma.PaymentUpdateInput,
  ): Promise<Payment>;

  createTutorRequest(request: InsertTutorRequest): Promise<TutorRequest>;
  getTutorRequestById(id: number): Promise<TutorRequest | null>;
  getTutorRequestsByParent(parentId: number): Promise<TutorRequest[]>;
  getTutorRequestsByTeacher(teacherId: number): Promise<TutorRequest[]>;
  updateTutorRequest(
    id: number,
    request: Prisma.TutorRequestUpdateInput,
  ): Promise<TutorRequest>;

  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesBetweenUsers(user1Id: number, user2Id: number): Promise<Message[]>;
  getMessagesByUser(userId: number): Promise<Message[]>;
  markMessageAsRead(id: number): Promise<Message>;
  getThreadMessages(teacherUserId: number, studentId: number): Promise<(Message & { senderName?: string })[]>;
  getConversationSummaries(userId: number, role: string): Promise<ConversationSummary[]>;

  createProgressReport(report: InsertProgressReport): Promise<ProgressReport>;
  getProgressReportsByStudent(studentId: number): Promise<ProgressReport[]>;
  getProgressReportsByTeacher(teacherId: number): Promise<ProgressReport[]>;
  getProgressReportsByParent(parentId: number): Promise<(ProgressReport & { studentName?: string; teacherName?: string })[]>;

  createClarification(
    clarification: InsertClarification,
  ): Promise<Clarification>;
  getClarificationsByStudent(studentId: number): Promise<Clarification[]>;
  getClarificationsByAssignment(assignmentId: number): Promise<Clarification[]>;
  updateClarification(
    id: number,
    clarification: Prisma.ClarificationUpdateInput,
  ): Promise<Clarification>;

  createParentalControl(
    control: InsertParentalControl,
  ): Promise<ParentalControl>;
  getParentalControlByStudent(
    studentId: number,
  ): Promise<ParentalControl | null>;
  updateParentalControl(
    id: number,
    control: Prisma.ParentalControlUpdateInput,
  ): Promise<ParentalControl>;

  createTutorRating(rating: InsertTutorRating): Promise<TutorRating>;
  getRatingsByTeacher(teacherId: number): Promise<TutorRating[]>;
  getRatingsByParent(parentId: number): Promise<TutorRating[]>;

  createEarnings(earnings: InsertEarnings): Promise<Earnings>;
  getEarningsByTeacher(teacherId: number): Promise<Earnings[]>;

  createStudentInvite(
    invite: Prisma.StudentInviteCreateInput,
  ): Promise<StudentInvite>;
  getStudentInviteByToken(token: string): Promise<StudentInvite | null>;
  getStudentInvitesByParent(parentId: number): Promise<StudentInvite[]>;
  updateStudentInvite(
    id: number,
    invite: Prisma.StudentInviteUpdateInput,
  ): Promise<StudentInvite>;
  deleteStudentInvite(token: string): Promise<void>;

  getAllUsers(): Promise<User[]>;

  // System Settings
  getSystemSetting(key: string): Promise<SystemSettings | null>;
  setSystemSetting(
    key: string,
    value: string,
    description?: string,
  ): Promise<SystemSettings>;
  getAllSystemSettings(): Promise<SystemSettings[]>;

  // Teacher-Student Assignments (direct assignment without request flow)
  createTeacherStudentAssignment(
    assignment: InsertTeacherStudentAssignment,
  ): Promise<TeacherStudentAssignment>;
  getTeacherStudentAssignment(
    teacherId: number,
    studentId: number,
  ): Promise<TeacherStudentAssignment | null>;
  getStudentsByTeacherDirect(
    teacherId: number,
  ): Promise<(Student & { email?: string })[]>;
  getAllStudentsForTeachers(): Promise<(Student & { email?: string })[]>;
  assignStudentToFirstAvailableTeacher(
    studentId: number,
  ): Promise<TeacherStudentAssignment | null>;
  removeTeacherStudentAssignment(
    teacherId: number,
    studentId: number,
  ): Promise<void>;
  getAssignedTeachersForStudent(
    studentId: number,
  ): Promise<TeacherStudentAssignment[]>;
}

class PrismaStorage implements IStorage {
  async createUser(user: Prisma.UserCreateInput): Promise<User> {
    return (await prisma.user.create({ data: user })) as User;
  }

  async getUserById(id: number): Promise<User | null> {
    return (await prisma.user.findUnique({ where: { id } })) as User | null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return (await prisma.user.findUnique({ where: { email } })) as User | null;
  }

  async getUserByEmailVerifyToken(token: string): Promise<User | null> {
    return (await prisma.user.findUnique({
      where: { emailVerifyToken: token },
    })) as User | null;
  }

  async getUserByGoogleId(googleId: string): Promise<User | null> {
    return (await prisma.user.findUnique({
      where: { googleId },
    })) as User | null;
  }

  async updateUser(id: number, user: Prisma.UserUpdateInput): Promise<User> {
    return (await prisma.user.update({ where: { id }, data: user })) as User;
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    return (await prisma.student.create({ data: student })) as Student;
  }

  async getStudentById(id: number): Promise<Student | null> {
    return (await prisma.student.findUnique({
      where: { id },
    })) as Student | null;
  }

  async getStudentByUserId(userId: number): Promise<Student | null> {
    return (await prisma.student.findUnique({
      where: { userId },
    })) as Student | null;
  }

  async getStudentsByParent(
    parentId: number,
  ): Promise<(Student & { email?: string })[]> {
    const students = await prisma.student.findMany({
      where: { parentId },
      include: { user: true },
    });
    return students.map((s: any) => ({
      ...s,
      email: s.user?.email,
      user: undefined,
    })) as (Student & { email?: string })[];
  }

  async getStudentsByTeacher(
    teacherId: number,
  ): Promise<(Student & { email?: string; parentName?: string; parentId?: number })[]> {
    const requests = await prisma.tutorRequest.findMany({
      where: { teacherId, status: "approved" },
      include: {
        parent: { include: { parentStudents: { include: { user: true } } } },
      },
    });
    const studentMap = new Map<number, Student & { email?: string; parentName?: string; parentId?: number }>();
    requests.forEach((r) => {
      if (r.studentId) {
        // Specific student was requested — only include that student
        const s = r.parent.parentStudents.find((ps: any) => ps.id === r.studentId);
        if (s && !studentMap.has(s.id)) {
          studentMap.set(s.id, {
            ...s,
            email: s.user?.email,
            parentName: (r.parent as any).name,
            parentId: r.parentId,
            user: undefined,
          } as Student & { email?: string; parentName?: string; parentId?: number });
        }
      } else {
        // Legacy requests without studentId — include all of parent's students
        r.parent.parentStudents.forEach((s: any) => {
          if (!studentMap.has(s.id)) {
            studentMap.set(s.id, {
              ...s,
              email: s.user?.email,
              parentName: (r.parent as any).name,
              parentId: r.parentId,
              user: undefined,
            } as Student & { email?: string; parentName?: string; parentId?: number });
          }
        });
      }
    });
    return Array.from(studentMap.values());
  }

  async updateStudent(
    id: number,
    student: Prisma.StudentUpdateInput,
  ): Promise<Student> {
    return (await prisma.student.update({
      where: { id },
      data: student,
    })) as Student;
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    return (await prisma.assignment.create({ data: assignment })) as Assignment;
  }

  async getAssignmentById(id: number): Promise<Assignment | null> {
    return (await prisma.assignment.findUnique({
      where: { id },
    })) as Assignment | null;
  }

  async getAssignmentsByTeacher(teacherId: number): Promise<Assignment[]> {
    return (await prisma.assignment.findMany({
      where: { teacherId },
    })) as Assignment[];
  }

  async getAssignmentsByGradeLevel(gradeLevel: string): Promise<Assignment[]> {
    return (await prisma.assignment.findMany({
      where: { gradeLevel },
    })) as Assignment[];
  }

  async getAllAssignments(): Promise<Assignment[]> {
    return (await prisma.assignment.findMany()) as Assignment[];
  }

  async updateAssignment(
    id: number,
    assignment: Prisma.AssignmentUpdateInput,
  ): Promise<Assignment> {
    return (await prisma.assignment.update({
      where: { id },
      data: assignment,
    })) as Assignment;
  }

  async deleteAssignment(id: number): Promise<void> {
    await prisma.assignment.delete({ where: { id } });
  }

  async createStudentAssignment(
    studentAssignment: InsertStudentAssignment,
  ): Promise<StudentAssignment> {
    return (await prisma.studentAssignment.create({
      data: studentAssignment,
    })) as StudentAssignment;
  }

  async getStudentAssignmentById(
    id: number,
  ): Promise<StudentAssignment | null> {
    return (await prisma.studentAssignment.findUnique({
      where: { id },
    })) as StudentAssignment | null;
  }

  async getStudentAssignmentsByStudent(
    studentId: number,
  ): Promise<StudentAssignment[]> {
    return (await prisma.studentAssignment.findMany({
      where: { studentId },
    })) as StudentAssignment[];
  }

  async getStudentAssignmentsByAssignment(
    assignmentId: number,
  ): Promise<StudentAssignment[]> {
    return (await prisma.studentAssignment.findMany({
      where: { assignmentId },
    })) as StudentAssignment[];
  }

  async updateStudentAssignment(
    id: number,
    studentAssignment: Prisma.StudentAssignmentUpdateInput,
  ): Promise<StudentAssignment> {
    return (await prisma.studentAssignment.update({
      where: { id },
      data: studentAssignment,
    })) as StudentAssignment;
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    return (await prisma.material.create({ data: material })) as Material;
  }

  async getMaterialById(id: number): Promise<Material | null> {
    return (await prisma.material.findUnique({
      where: { id },
    })) as Material | null;
  }

  async getMaterialsByTeacher(teacherId: number): Promise<Material[]> {
    return (await prisma.material.findMany({
      where: { teacherId },
    })) as Material[];
  }

  async getMaterialsBySubject(subject: string): Promise<Material[]> {
    return (await prisma.material.findMany({
      where: { subject },
    })) as Material[];
  }

  async getMaterialsByGradeLevel(gradeLevel: string): Promise<Material[]> {
    return (await prisma.material.findMany({
      where: { gradeLevel },
    })) as Material[];
  }

  async getAllMaterials(): Promise<Material[]> {
    return (await prisma.material.findMany()) as Material[];
  }

  async getAllTeachers(): Promise<User[]> {
    return (await prisma.user.findMany({
      where: { role: "teacher" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
        googleId: true,
        profilePicture: true,
        teachingSubjects: true,
        yearsExperience: true,
        // Exclude password and emailVerifyToken for security
      },
    })) as User[];
  }

  async updateMaterial(
    id: number,
    material: Partial<InsertMaterial>,
  ): Promise<Material> {
    return (await prisma.material.update({
      where: { id },
      data: material,
    })) as Material;
  }

  async deleteMaterial(id: number): Promise<void> {
    await prisma.material.delete({ where: { id } });
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    return (await prisma.schedule.create({ data: schedule })) as Schedule;
  }

  async getSchedulesByTeacher(teacherId: number): Promise<Schedule[]> {
    return (await prisma.schedule.findMany({
      where: { teacherId },
    })) as Schedule[];
  }

  async getSchedulesByStudent(studentId: number): Promise<Schedule[]> {
    return (await prisma.schedule.findMany({
      where: { studentId },
    })) as Schedule[];
  }

  async updateSchedule(
    id: number,
    schedule: Prisma.ScheduleUpdateInput,
  ): Promise<Schedule> {
    return (await prisma.schedule.update({
      where: { id },
      data: schedule,
    })) as Schedule;
  }

  async deleteSchedule(id: number): Promise<void> {
    await prisma.schedule.delete({ where: { id } });
  }

  async createSession(session: Prisma.SessionCreateInput): Promise<Session> {
    return (await prisma.session.create({
      data: session,
    })) as unknown as Session;
  }

  async getSessionById(id: number): Promise<Session | null> {
    return (await prisma.session.findUnique({
      where: { id },
    })) as unknown as Session | null;
  }

  async getSessionsByTeacher(teacherId: number): Promise<Session[]> {
    return (await prisma.session.findMany({
      where: { teacherId },
    })) as unknown as Session[];
  }

  async getSessionsByStudent(studentId: number): Promise<Session[]> {
    return (await prisma.session.findMany({
      where: { studentIds: { has: studentId } },
    })) as unknown as Session[];
  }

  async getAllSessions(): Promise<Session[]> {
    return (await prisma.session.findMany()) as unknown as Session[];
  }

  async updateSession(id: number, session: any): Promise<Session> {
    return (await prisma.session.update({
      where: { id },
      data: session,
    })) as unknown as Session;
  }

  async deleteSession(id: number): Promise<void> {
    await prisma.session.delete({ where: { id } });
  }

  async createFeedback(feedback: InsertFeedback): Promise<Feedback> {
    return (await prisma.feedback.create({ data: feedback })) as Feedback;
  }

  async getFeedbackByStudent(studentId: number): Promise<Feedback[]> {
    return (await prisma.feedback.findMany({
      where: { studentId },
    })) as Feedback[];
  }

  async getFeedbackByTeacher(teacherId: number): Promise<Feedback[]> {
    return (await prisma.feedback.findMany({
      where: { teacherId },
    })) as Feedback[];
  }

  async createAttendance(attendance: InsertAttendance): Promise<Attendance> {
    return (await prisma.attendance.create({ data: attendance })) as Attendance;
  }

  async getAttendanceByStudent(studentId: number): Promise<Attendance[]> {
    return (await prisma.attendance.findMany({
      where: { studentId },
    })) as Attendance[];
  }

  async getAttendanceBySession(sessionId: number): Promise<Attendance[]> {
    return (await prisma.attendance.findMany({
      where: { sessionId },
    })) as Attendance[];
  }

  async updateAttendance(
    id: number,
    attendance: Prisma.AttendanceUpdateInput,
  ): Promise<Attendance> {
    return (await prisma.attendance.update({
      where: { id },
      data: attendance,
    })) as Attendance;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    return (await prisma.payment.create({ data: payment })) as Payment;
  }

  async getPaymentsByParent(parentId: number): Promise<Payment[]> {
    return (await prisma.payment.findMany({
      where: { parentId },
    })) as Payment[];
  }

  async getPaymentsByTeacher(teacherId: number): Promise<Payment[]> {
    return (await prisma.payment.findMany({
      where: { teacherId },
    })) as Payment[];
  }

  async updatePayment(
    id: number,
    payment: Prisma.PaymentUpdateInput,
  ): Promise<Payment> {
    return (await prisma.payment.update({
      where: { id },
      data: payment,
    })) as Payment;
  }

  async createTutorRequest(request: InsertTutorRequest): Promise<TutorRequest> {
    return (await prisma.tutorRequest.create({
      data: request,
    })) as TutorRequest;
  }

  async getTutorRequestById(id: number): Promise<TutorRequest | null> {
    return (await prisma.tutorRequest.findUnique({
      where: { id },
    })) as TutorRequest | null;
  }

  async getTutorRequestsByParent(parentId: number): Promise<TutorRequest[]> {
    return (await prisma.tutorRequest.findMany({
      where: { parentId },
    })) as TutorRequest[];
  }

  async getTutorRequestsByTeacher(teacherId: number): Promise<TutorRequest[]> {
    return (await prisma.tutorRequest.findMany({
      where: { teacherId },
    })) as TutorRequest[];
  }

  async updateTutorRequest(
    id: number,
    request: Prisma.TutorRequestUpdateInput,
  ): Promise<TutorRequest> {
    return (await prisma.tutorRequest.update({
      where: { id },
      data: request,
    })) as TutorRequest;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    return (await prisma.message.create({ data: message })) as Message;
  }

  async getMessagesBetweenUsers(
    user1Id: number,
    user2Id: number,
  ): Promise<Message[]> {
    return (await prisma.message.findMany({
      where: {
        OR: [
          { senderId: user1Id, receiverId: user2Id },
          { senderId: user2Id, receiverId: user1Id },
        ],
      },
      orderBy: { timestamp: "asc" },
    })) as Message[];
  }

  async getMessagesByUser(userId: number): Promise<Message[]> {
    return (await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
    })) as Message[];
  }

  async markMessageAsRead(id: number): Promise<Message> {
    return (await prisma.message.update({
      where: { id },
      data: { isRead: true },
    })) as Message;
  }

  async getThreadMessages(teacherUserId: number, studentId: number): Promise<(Message & { senderName?: string })[]> {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return [];
    const participantIds = [teacherUserId, student.userId, student.parentId];
    const messages = await prisma.message.findMany({
      where: {
        AND: [
          { senderId: { in: participantIds } },
          { receiverId: { in: participantIds } },
        ],
      },
      include: { sender: { select: { name: true } } },
      orderBy: { timestamp: "asc" },
    });
    return messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      receiverId: m.receiverId,
      message: m.message,
      timestamp: m.timestamp,
      isRead: m.isRead,
      senderName: m.sender.name,
    }));
  }

  async getConversationSummaries(userId: number, role: string): Promise<ConversationSummary[]> {
    // Helper: batch-fetch last message and unread count for each conversation group.
    // A group is a (teacherUserId, studentUserId, parentUserId) triplet identifying a thread.
    type ConvGroup = {
      studentId: number;
      teacherUserId: number;
      studentUserId: number;
      parentUserId: number;
    };

    const buildSummaries = async (
      groups: ConvGroup[],
      requesterUserId: number,
      teacherName: string,
      parentName: string | null,
      studentNames: Map<number, string>,
    ): Promise<ConversationSummary[]> => {
      if (groups.length === 0) return [];

      // Batch: collect all participant IDs across all groups, then fetch messages once
      const allParticipantIds = new Set<number>();
      for (const g of groups) {
        allParticipantIds.add(g.teacherUserId);
        allParticipantIds.add(g.studentUserId);
        allParticipantIds.add(g.parentUserId);
      }
      const participantArr = Array.from(allParticipantIds);

      // Single message query ordered newest-first; we scan it once per group
      const allMessages = await prisma.message.findMany({
        where: {
          AND: [
            { senderId: { in: participantArr } },
            { receiverId: { in: participantArr } },
          ],
        },
        orderBy: { timestamp: "desc" },
        select: { senderId: true, receiverId: true, message: true, timestamp: true, isRead: true },
      });

      const result: ConversationSummary[] = [];
      for (const g of groups) {
        const triplet = new Set([g.teacherUserId, g.studentUserId, g.parentUserId]);
        let lastMsg: { message: string; timestamp: string } | null = null;
        let unreadCount = 0;
        for (const m of allMessages) {
          if (triplet.has(m.senderId) && triplet.has(m.receiverId)) {
            if (!lastMsg) lastMsg = m;
            if (!m.isRead && m.receiverId === requesterUserId) unreadCount++;
          }
        }
        result.push({
          studentId: g.studentId,
          teacherUserId: g.teacherUserId,
          studentName: studentNames.get(g.studentId) ?? "",
          teacherName,
          parentName,
          lastMessage: lastMsg?.message ?? null,
          lastMessageTimestamp: lastMsg?.timestamp ?? null,
          unreadCount,
        });
      }
      return result;
    };

    // ── TEACHER ──────────────────────────────────────────────────────────────
    if (role === "teacher") {
      const setting = await prisma.systemSettings.findFirst({ where: { key: "tutor_request_mode" } });
      const isTutorMode = setting?.value === "true";

      type StudentRow = { id: number; name: string; userId: number; parentId: number };
      let students: StudentRow[];

      if (isTutorMode) {
        const requests = await prisma.tutorRequest.findMany({
          where: { teacherId: userId, status: "approved" },
          include: { parent: { include: { parentStudents: { select: { id: true, name: true, userId: true, parentId: true } } } } },
        });
        const seen = new Set<number>();
        students = [];
        for (const r of requests) {
          const candidates = r.studentId
            ? r.parent.parentStudents.filter((s: any) => s.id === r.studentId)
            : r.parent.parentStudents;
          for (const s of candidates as any[]) {
            if (!seen.has(s.id)) {
              seen.add(s.id);
              students.push({ id: s.id, name: s.name, userId: s.userId, parentId: s.parentId });
            }
          }
        }
      } else {
        const all = await prisma.student.findMany({
          select: { id: true, name: true, userId: true, parentId: true },
        });
        students = all;
      }

      if (students.length === 0) return [];

      // Batch-fetch teacher name and all parent names in parallel
      const parentIds = Array.from(new Set(students.map((s) => s.parentId).filter(Boolean))) as number[];
      const [teacher, parentUsers] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
        prisma.user.findMany({ where: { id: { in: parentIds } }, select: { id: true, name: true } }),
      ]);
      if (!teacher) return [];

      const parentNameMap = new Map(parentUsers.map((p) => [p.id, p.name]));
      const studentNames = new Map(students.map((s) => [s.id, s.name]));
      const groups: ConvGroup[] = students.map((s) => ({
        studentId: s.id,
        teacherUserId: userId,
        studentUserId: s.userId,
        parentUserId: s.parentId,
      }));

      // buildSummaries uses a shared parentName param; patch per-student after
      const base = await buildSummaries(groups, userId, teacher.name, null, studentNames);
      return base.map((s) => {
        const student = students.find((st) => st.id === s.studentId)!;
        return { ...s, parentName: parentNameMap.get(student.parentId) ?? null };
      });
    }

    // ── PARENT ───────────────────────────────────────────────────────────────
    if (role === "parent") {
      const [parentStudents, parentUser, directAssignments, tutorRequests] = await Promise.all([
        prisma.student.findMany({
          where: { parentId: userId },
          select: { id: true, name: true, userId: true, parentId: true },
        }),
        prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
        // Direct assignments for this parent's children (student-specific)
        prisma.teacherStudentAssignment.findMany({
          where: { student: { parentId: userId }, status: "active" },
          include: { teacher: { select: { id: true, name: true } } },
        }),
        // Student-specific tutor requests for this parent's children
        prisma.tutorRequest.findMany({
          where: { parentId: userId, status: "approved", studentId: { not: null } },
          include: { teacher: { select: { id: true, name: true } } },
        }),
      ]);

      if (parentStudents.length === 0) return [];

      // Build student→teacher map (prefer direct assignment, fallback to student-specific request)
      const directMap = new Map<number, { id: number; name: string }>();
      for (const a of directAssignments) {
        directMap.set((a as any).studentId, a.teacher as { id: number; name: string });
      }
      const requestMap = new Map<number, { id: number; name: string }>();
      for (const r of tutorRequests) {
        if (r.studentId != null && !requestMap.has(r.studentId)) {
          requestMap.set(r.studentId, r.teacher as { id: number; name: string });
        }
      }

      type StudentWithTeacher = { id: number; name: string; userId: number; parentId: number; teacher: { id: number; name: string } | null };
      const studentsWithTeacher: StudentWithTeacher[] = parentStudents.map((s) => ({
        ...s,
        teacher: directMap.get(s.id) ?? requestMap.get(s.id) ?? null,
      }));

      // Group by teacher to share one message batch per teacher group
      const teacherGroups = new Map<number, StudentWithTeacher[]>();
      const noTeacherStudents: StudentWithTeacher[] = [];
      for (const s of studentsWithTeacher) {
        if (!s.teacher) { noTeacherStudents.push(s); continue; }
        const key = s.teacher.id;
        if (!teacherGroups.has(key)) teacherGroups.set(key, []);
        teacherGroups.get(key)!.push(s);
      }

      const summaries: ConversationSummary[] = [];
      for (const [teacherId, group] of Array.from(teacherGroups.entries())) {
        const teacherName = group[0].teacher!.name;
        const convGroups: ConvGroup[] = group.map((s: StudentWithTeacher) => ({
          studentId: s.id,
          teacherUserId: teacherId,
          studentUserId: s.userId,
          parentUserId: userId,
        }));
        const studentNames = new Map(group.map((s: StudentWithTeacher) => [s.id, s.name]));
        const partial = await buildSummaries(convGroups, userId, teacherName, parentUser?.name ?? null, studentNames);
        summaries.push(...partial);
      }

      for (const s of noTeacherStudents) {
        summaries.push({
          studentId: s.id,
          teacherUserId: 0,
          studentName: s.name,
          teacherName: "",
          parentName: parentUser?.name ?? null,
          lastMessage: null,
          lastMessageTimestamp: null,
          unreadCount: 0,
        });
      }

      return summaries;
    }

    // ── STUDENT ──────────────────────────────────────────────────────────────
    if (role === "student") {
      const studentRecord = await prisma.student.findUnique({
        where: { userId },
        select: { id: true, name: true, userId: true, parentId: true },
      });
      if (!studentRecord) return [];

      // Fetch teacher in parallel (direct assignment preferred, then student-specific tutor request)
      const [directAssignment, tutorRequest, parentUser] = await Promise.all([
        prisma.teacherStudentAssignment.findFirst({
          where: { studentId: studentRecord.id, status: "active" },
          include: { teacher: { select: { id: true, name: true } } },
        }),
        prisma.tutorRequest.findFirst({
          where: { studentId: studentRecord.id, status: "approved" },
          include: { teacher: { select: { id: true, name: true } } },
        }),
        prisma.user.findUnique({ where: { id: studentRecord.parentId }, select: { name: true } }),
      ]);

      const teacherUser = (directAssignment?.teacher ?? tutorRequest?.teacher ?? null) as { id: number; name: string } | null;
      if (!teacherUser) return [];

      const groups: ConvGroup[] = [{
        studentId: studentRecord.id,
        teacherUserId: teacherUser.id,
        studentUserId: userId,
        parentUserId: studentRecord.parentId,
      }];
      const studentNames = new Map([[studentRecord.id, studentRecord.name]]);
      return buildSummaries(groups, userId, teacherUser.name, parentUser?.name ?? null, studentNames);
    }

    return [];
  }

  async createProgressReport(
    report: InsertProgressReport,
  ): Promise<ProgressReport> {
    return (await prisma.progressReport.create({
      data: report,
    })) as ProgressReport;
  }

  async getProgressReportsByStudent(
    studentId: number,
  ): Promise<ProgressReport[]> {
    return (await prisma.progressReport.findMany({
      where: { studentId },
    })) as ProgressReport[];
  }

  async getProgressReportsByTeacher(
    teacherId: number,
  ): Promise<ProgressReport[]> {
    return (await prisma.progressReport.findMany({
      where: { teacherId },
    })) as ProgressReport[];
  }

  async getProgressReportsByParent(
    parentId: number,
  ): Promise<(ProgressReport & { studentName?: string; teacherName?: string })[]> {
    const students = await prisma.student.findMany({ where: { parentId } });
    const studentIds = students.map((s: any) => s.id);
    if (studentIds.length === 0) return [];
    const reports = await prisma.progressReport.findMany({
      where: { studentId: { in: studentIds } },
      include: {
        student: true,
        teacher: true,
      },
      orderBy: { date: "desc" },
    });
    return reports.map((r: any) => ({
      ...r,
      studentName: r.student?.name,
      teacherName: r.teacher?.name,
      student: undefined,
      teacher: undefined,
    })) as (ProgressReport & { studentName?: string; teacherName?: string })[];
  }

  async createClarification(
    clarification: InsertClarification,
  ): Promise<Clarification> {
    return (await prisma.clarification.create({
      data: clarification,
    })) as Clarification;
  }

  async getClarificationsByStudent(
    studentId: number,
  ): Promise<Clarification[]> {
    return (await prisma.clarification.findMany({
      where: { studentId },
    })) as Clarification[];
  }

  async getClarificationsByAssignment(
    assignmentId: number,
  ): Promise<Clarification[]> {
    return (await prisma.clarification.findMany({
      where: { assignmentId },
    })) as Clarification[];
  }

  async updateClarification(
    id: number,
    clarification: Prisma.ClarificationUpdateInput,
  ): Promise<Clarification> {
    return (await prisma.clarification.update({
      where: { id },
      data: clarification,
    })) as Clarification;
  }

  async createParentalControl(
    control: InsertParentalControl,
  ): Promise<ParentalControl> {
    return (await prisma.parentalControl.create({
      data: control,
    })) as ParentalControl;
  }

  async getParentalControlByStudent(
    studentId: number,
  ): Promise<ParentalControl | null> {
    return (await prisma.parentalControl.findUnique({
      where: { studentId },
    })) as ParentalControl | null;
  }

  async updateParentalControl(
    id: number,
    control: Prisma.ParentalControlUpdateInput,
  ): Promise<ParentalControl> {
    return (await prisma.parentalControl.update({
      where: { id },
      data: control,
    })) as ParentalControl;
  }

  async createTutorRating(rating: InsertTutorRating): Promise<TutorRating> {
    return (await prisma.tutorRating.create({ data: rating })) as TutorRating;
  }

  async getRatingsByTeacher(teacherId: number): Promise<TutorRating[]> {
    return (await prisma.tutorRating.findMany({
      where: { teacherId },
    })) as TutorRating[];
  }

  async getRatingsByParent(parentId: number): Promise<TutorRating[]> {
    return (await prisma.tutorRating.findMany({
      where: { parentId },
    })) as TutorRating[];
  }

  async createEarnings(earnings: InsertEarnings): Promise<Earnings> {
    return (await prisma.earnings.create({ data: earnings })) as Earnings;
  }

  async getEarningsByTeacher(teacherId: number): Promise<Earnings[]> {
    return (await prisma.earnings.findMany({
      where: { teacherId },
    })) as Earnings[];
  }

  async createStudentInvite(
    invite: Prisma.StudentInviteCreateInput,
  ): Promise<StudentInvite> {
    return (await prisma.studentInvite.create({
      data: invite,
    })) as StudentInvite;
  }

  async getStudentInviteByToken(token: string): Promise<StudentInvite | null> {
    return (await prisma.studentInvite.findUnique({
      where: { token },
    })) as StudentInvite | null;
  }

  async getStudentInvitesByParent(parentId: number): Promise<StudentInvite[]> {
    return (await prisma.studentInvite.findMany({
      where: { parentId },
    })) as StudentInvite[];
  }

  async updateStudentInvite(
    id: number,
    invite: Prisma.StudentInviteUpdateInput,
  ): Promise<StudentInvite> {
    return (await prisma.studentInvite.update({
      where: { id },
      data: invite,
    })) as StudentInvite;
  }

  async deleteStudentInvite(token: string): Promise<void> {
    await prisma.studentInvite.delete({ where: { token } });
  }

  async getAllUsers(): Promise<User[]> {
    return (await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
        googleId: true,
        profilePicture: true,
        // Exclude password and emailVerifyToken for security
      },
    })) as User[];
  }

  // System Settings methods
  async getSystemSetting(key: string): Promise<SystemSettings | null> {
    return (await prisma.systemSettings.findUnique({
      where: { key },
    })) as SystemSettings | null;
  }

  async setSystemSetting(
    key: string,
    value: string,
    description?: string,
  ): Promise<SystemSettings> {
    return (await prisma.systemSettings.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    })) as SystemSettings;
  }

  async getAllSystemSettings(): Promise<SystemSettings[]> {
    return (await prisma.systemSettings.findMany()) as SystemSettings[];
  }

  // Teacher-Student Assignment methods
  async createTeacherStudentAssignment(
    assignment: InsertTeacherStudentAssignment,
  ): Promise<TeacherStudentAssignment> {
    return (await prisma.teacherStudentAssignment.create({
      data: assignment,
    })) as TeacherStudentAssignment;
  }

  async getTeacherStudentAssignment(
    teacherId: number,
    studentId: number,
  ): Promise<TeacherStudentAssignment | null> {
    return (await prisma.teacherStudentAssignment.findUnique({
      where: { teacherId_studentId: { teacherId, studentId } },
    })) as TeacherStudentAssignment | null;
  }

  async getStudentsByTeacherDirect(
    teacherId: number,
  ): Promise<(Student & { email?: string })[]> {
    const assignments = await prisma.teacherStudentAssignment.findMany({
      where: { teacherId, status: "active" },
      include: { student: { include: { user: true } } },
    });
    return assignments.map((a: any) => ({
      ...a.student,
      email: a.student.user?.email,
      user: undefined,
    })) as (Student & { email?: string })[];
  }

  async getAllStudentsForTeachers(): Promise<(Student & { email?: string; parentName?: string; parentId?: number })[]> {
    const students = await prisma.student.findMany({
      include: { user: true, parent: true },
    });
    return students.map((s: any) => ({
      ...s,
      email: s.user?.email,
      parentName: s.parent?.name,
      user: undefined,
      parent: undefined,
    })) as (Student & { email?: string; parentName?: string; parentId?: number })[];
  }

  async assignStudentToFirstAvailableTeacher(
    studentId: number,
  ): Promise<TeacherStudentAssignment | null> {
    // Find the first available teacher (teacher with least students)
    const teachers = await prisma.user.findMany({
      where: { role: "teacher" },
      include: {
        teacherStudentAssignments: {
          where: { status: "active" },
        },
      },
    });

    if (teachers.length === 0) return null;

    // Sort by number of students (ascending) to balance load
    teachers.sort(
      (a, b) =>
        a.teacherStudentAssignments.length - b.teacherStudentAssignments.length,
    );
    const selectedTeacher = teachers[0];

    // Check if assignment already exists
    const existing = await prisma.teacherStudentAssignment.findUnique({
      where: {
        teacherId_studentId: { teacherId: selectedTeacher.id, studentId },
      },
    });

    if (existing) {
      return existing as TeacherStudentAssignment;
    }

    // Create new assignment
    return (await prisma.teacherStudentAssignment.create({
      data: {
        teacherId: selectedTeacher.id,
        studentId,
        assignedDate: new Date().toISOString(),
        status: "active",
      },
    })) as TeacherStudentAssignment;
  }

  async removeTeacherStudentAssignment(
    teacherId: number,
    studentId: number,
  ): Promise<void> {
    await prisma.teacherStudentAssignment.delete({
      where: { teacherId_studentId: { teacherId, studentId } },
    });
  }

  async getAssignedTeachersForStudent(
    studentId: number,
  ): Promise<TeacherStudentAssignment[]> {
    return (await prisma.teacherStudentAssignment.findMany({
      where: { studentId, status: "active" },
    })) as TeacherStudentAssignment[];
  }
}

export const storage = new PrismaStorage();
