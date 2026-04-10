import prisma from "./db";
import { Prisma } from "@prisma/client";
import { slugify } from "../shared/slugify";
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
  EnrichedTutorRequest,
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
  Classroom,
  InsertClassroom,
  ClassroomEnrollment,
  ClassroomPost,
  InsertClassroomPost,
  ClassroomAssignment,
  InsertClassroomAssignment,
  ClassroomSubmission,
  ClassroomMaterial,
  InsertClassroomMaterial,
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
  customName: string | null;
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
  getSchedulesByTeacher(teacherId: number): Promise<(Schedule & { studentName: string })[]>;
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
  getFeedbackByTeacher(teacherId: number): Promise<(Feedback & { studentName: string })[]>;

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
  getTutorRequestsByParent(parentId: number): Promise<EnrichedTutorRequest[]>;
  getTutorRequestsByTeacher(teacherId: number): Promise<EnrichedTutorRequest[]>;
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
  getStudentInviteByCode(code: string): Promise<StudentInvite | null>;
  getStudentInvitesByParent(parentId: number): Promise<StudentInvite[]>;
  updateStudentInvite(
    id: number,
    invite: Prisma.StudentInviteUpdateInput,
  ): Promise<StudentInvite>;
  deleteStudentInvite(token: string): Promise<void>;
  deleteStudentInviteById(id: number): Promise<void>;

  getAllUsers(): Promise<(User & { createdAt: Date | null })[]>;

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
  findFirstAvailableTeacherId(studentId: number): Promise<number | null>;
  removeTeacherStudentAssignment(
    teacherId: number,
    studentId: number,
  ): Promise<void>;
  getAssignedTeachersForStudent(
    studentId: number,
  ): Promise<TeacherStudentAssignment[]>;

  getThreadLabel(teacherUserId: number, studentId: number): Promise<string | null>;
  setThreadLabel(teacherUserId: number, studentId: number, name: string | null): Promise<void>;

  // ─── Classrooms ──────────────────────────────────────────────────────────
  createClassroom(data: InsertClassroom): Promise<Classroom>;
  getClassroomById(id: number): Promise<Classroom | null>;
  getClassroomBySlug(slug: string): Promise<Classroom | null>;
  getClassroomsByTeacher(teacherId: number): Promise<Classroom[]>;
  getClassroomsForStudent(studentId: number): Promise<Classroom[]>;
  getClassroomsForParent(studentId: number): Promise<Classroom[]>;
  updateClassroom(id: number, data: Partial<InsertClassroom>): Promise<Classroom>;
  deleteClassroom(id: number): Promise<void>;

  enrollStudent(classroomId: number, studentId: number): Promise<ClassroomEnrollment>;
  unenrollStudent(classroomId: number, studentId: number): Promise<void>;
  getEnrollments(classroomId: number): Promise<(ClassroomEnrollment & { student: { id: number; name: string; userId: number } })[]>;

  createClassroomPost(data: InsertClassroomPost & { authorName?: string }): Promise<ClassroomPost & { authorName: string }>;
  getClassroomPosts(classroomId: number): Promise<(ClassroomPost & { authorName: string })[]>;

  createClassroomAssignment(data: InsertClassroomAssignment): Promise<ClassroomAssignment>;
  getClassroomAssignments(classroomId: number): Promise<ClassroomAssignment[]>;
  getClassroomAssignmentBySlug(classroomId: number, slug: string): Promise<ClassroomAssignment | null>;
  getClassroomAssignmentById(classroomId: number, id: number): Promise<ClassroomAssignment | null>;
  deleteClassroomAssignment(id: number): Promise<void>;

  getSubmissionsForAssignment(assignmentId: number): Promise<(ClassroomSubmission & { studentName: string })[]>;
  getSubmissionsForStudent(studentId: number, classroomId: number): Promise<ClassroomSubmission[]>;
  submitClassroomAssignment(assignmentId: number, studentId: number, content: string, dueDate: string, fileUrl?: string): Promise<ClassroomSubmission>;
  gradeClassroomSubmission(submissionId: number, grade: number, feedback: string | null, maxPoints: number): Promise<ClassroomSubmission>;

  createClassroomMaterial(data: InsertClassroomMaterial): Promise<ClassroomMaterial>;
  getClassroomMaterials(classroomId: number): Promise<ClassroomMaterial[]>;
  updateClassroomMaterial(id: number, data: Partial<InsertClassroomMaterial>): Promise<ClassroomMaterial>;
  deleteClassroomMaterial(id: number): Promise<void>;

  // ─── Notifications ────────────────────────────────────────────────────────
  createNotification(data: { userId: number; type: string; title: string; body: string; link?: string }): Promise<any>;
  getNotificationsForUser(userId: number, limit?: number): Promise<any[]>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  markNotificationRead(id: number, userId: number): Promise<any>;
  markAllNotificationsRead(userId: number): Promise<void>;

  getClassroomNotificationsForStudent(studentId: number): Promise<Record<number, {
    pendingCount: number;
    newMaterialsCount: number;
    newPostsCount: number;
    newCount: number;
    dueCount: number;
    dueSoonCount: number;
    total: number;
  }>>; // pendingCount = assignments pending + new materials + new posts

  getTeacherClassroomStats(userId: number): Promise<Record<number, { toGradeCount: number }>>;
}

class PrismaStorage implements IStorage {
  async createUser(user: Prisma.UserCreateInput): Promise<User> {
    const created = await prisma.user.create({ data: user });
    const slug = slugify(created.name, created.id);
    return (await prisma.user.update({ where: { id: created.id }, data: { slug } })) as User;
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
    const created = await prisma.assignment.create({ data: assignment });
    const slug = slugify(created.title, created.id);
    return (await prisma.assignment.update({ where: { id: created.id }, data: { slug } })) as Assignment;
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
    const created = await prisma.material.create({ data: material });
    const slug = slugify(created.title, created.id);
    return (await prisma.material.update({ where: { id: created.id }, data: { slug } })) as Material;
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
      where: { OR: [{ role: "teacher" }, { roles: { has: "teacher" } }] },
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

  async getSchedulesByTeacher(teacherId: number): Promise<(Schedule & { studentName: string })[]> {
    const rows = await prisma.schedule.findMany({
      where: { teacherId },
      include: { student: { select: { name: true } } },
    });
    return rows.map((r) => ({ ...r, studentName: r.student?.name ?? "Unknown student" })) as (Schedule & { studentName: string })[];
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

  async getFeedbackByTeacher(teacherId: number): Promise<(Feedback & { studentName: string })[]> {
    const rows = await prisma.feedback.findMany({
      where: { teacherId },
      include: { student: { select: { name: true } } },
    });
    return rows.map((r) => ({ ...r, studentName: r.student?.name ?? "Unknown student" })) as (Feedback & { studentName: string })[];
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

  async getTutorRequestsByParent(parentId: number): Promise<EnrichedTutorRequest[]> {
    const requests = await prisma.tutorRequest.findMany({
      where: { parentId },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        parent: { select: { id: true, name: true, email: true } },
      },
      orderBy: { id: "desc" },
    });
    return this._enrichWithStudent(requests);
  }

  async getTutorRequestsByTeacher(teacherId: number): Promise<EnrichedTutorRequest[]> {
    const requests = await prisma.tutorRequest.findMany({
      where: { teacherId },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        parent: { select: { id: true, name: true, email: true } },
      },
      orderBy: { id: "desc" },
    });
    return this._enrichWithStudent(requests);
  }

  private async _enrichWithStudent(
    requests: (Omit<TutorRequest, "status"> & { status: string; teacher: { name: string; email: string }; parent: { name: string } })[],
  ): Promise<EnrichedTutorRequest[]> {
    const studentIds = Array.from(new Set(requests.map(r => r.studentId).filter(Boolean) as number[]));
    const students = studentIds.length > 0
      ? await prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, name: true, gradeLevel: true } })
      : [];
    const studentMap = new Map(students.map(s => [s.id, s]));
    return requests.map(r => ({
      ...r,
      status: r.status as TutorRequest["status"],
      teacherName: r.teacher.name,
      teacherEmail: r.teacher.email,
      parentName: r.parent.name,
      studentName: r.studentId ? (studentMap.get(r.studentId)?.name ?? null) : null,
      studentGrade: r.studentId ? (studentMap.get(r.studentId)?.gradeLevel ?? null) : null,
    })) as EnrichedTutorRequest[];
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

    // Deduplicate broadcast siblings: a group send writes one row per recipient,
    // all sharing the same (senderId, timestamp, message). Keep only the first
    // row per logical send so the thread renders one bubble per send event.
    const seen = new Set<string>();
    const deduped = messages.filter((m) => {
      const key = `${m.senderId}|${m.timestamp}|${m.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduped.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      receiverId: m.receiverId,
      message: m.message,
      timestamp: m.timestamp,
      isRead: m.isRead,
      senderName: m.sender?.name ?? "Deleted user",
    }));
  }

  async getConversationSummaries(userId: number, role: string): Promise<ConversationSummary[]> {
    type ConvGroup = {
      studentId: number;
      teacherUserId: number;
      studentUserId: number;
      parentUserId: number;
    };

    const fetchThreadStats = async (
      groups: ConvGroup[],
      requesterUserId: number,
    ): Promise<Map<number, { lastMessage: string | null; lastMessageTimestamp: string | null; unreadCount: number }>> => {
      const result = new Map<number, { lastMessage: string | null; lastMessageTimestamp: string | null; unreadCount: number }>();
      if (groups.length === 0) return result;

      for (const g of groups) {
        result.set(g.studentId, { lastMessage: null, lastMessageTimestamp: null, unreadCount: 0 });
      }

      // Build a VALUES list of integer-cast triplets for the CTE (all values are server-derived numeric IDs)
      const valuesClause = groups
        .map((g) => `(${g.studentId}::int, ${g.teacherUserId}::int, ${g.studentUserId}::int, ${g.parentUserId}::int)`)
        .join(', ');

      const lastMsgRows = await prisma.$queryRaw<
        Array<{ student_id: number; last_message: string | null; last_ts: string | null }>
      >(Prisma.sql`
        WITH triplets(student_id, p1, p2, p3) AS (VALUES ${Prisma.raw(valuesClause)}),
        ranked AS (
          SELECT t.student_id, m.message AS last_message, m.timestamp AS last_ts,
                 ROW_NUMBER() OVER (PARTITION BY t.student_id ORDER BY m.timestamp DESC) AS rn
          FROM triplets t
          JOIN "Message" m ON m."senderId" IN (t.p1, t.p2, t.p3)
                          AND m."receiverId" IN (t.p1, t.p2, t.p3)
        )
        SELECT student_id, last_message, last_ts FROM ranked WHERE rn = 1
      `);

      const unreadRows = await prisma.$queryRaw<
        Array<{ student_id: number; unread_count: bigint }>
      >(Prisma.sql`
        WITH triplets(student_id, p1, p2, p3) AS (VALUES ${Prisma.raw(valuesClause)})
        SELECT t.student_id, COUNT(m.id) AS unread_count
        FROM triplets t
        JOIN "Message" m ON m."senderId" IN (t.p1, t.p2, t.p3)
                        AND m."receiverId" IN (t.p1, t.p2, t.p3)
                        AND m."receiverId" = ${requesterUserId}
                        AND m."isRead" = false
        GROUP BY t.student_id
      `);

      for (const row of lastMsgRows) {
        const entry = result.get(Number(row.student_id));
        if (entry) {
          entry.lastMessage = row.last_message;
          entry.lastMessageTimestamp = row.last_ts ? String(row.last_ts) : null;
        }
      }
      for (const row of unreadRows) {
        const entry = result.get(Number(row.student_id));
        if (entry) entry.unreadCount = Number(row.unread_count);
      }

      return result;
    };

    if (role === "teacher") {
      const setting = await prisma.systemSettings.findFirst({ where: { key: "tutor_request_mode" } });
      const isTutorMode = setting?.value === "true";

      type StudentRow = { id: number; name: string; userId: number; parentId: number };
      let students: StudentRow[];

      if (isTutorMode) {
        const requests = await prisma.tutorRequest.findMany({
          where: { teacherId: userId, status: "approved" },
          include: {
            parent: {
              include: {
                parentStudents: { select: { id: true, name: true, userId: true, parentId: true } },
              },
            },
          },
        });
        const seen = new Set<number>();
        students = [];
        for (const r of requests) {
          const candidates = r.studentId
            ? r.parent.parentStudents.filter((s) => s.id === r.studentId)
            : r.parent.parentStudents;
          for (const s of candidates) {
            if (!seen.has(s.id)) {
              seen.add(s.id);
              students.push({ id: s.id, name: s.name, userId: s.userId, parentId: s.parentId });
            }
          }
        }
      } else {
        // Direct-assignment mode: use approved TutorRequest as single source of truth
        const directRequests = await prisma.tutorRequest.findMany({
          where: { teacherId: userId, status: "approved" },
          include: {
            parent: {
              include: {
                parentStudents: { select: { id: true, name: true, userId: true, parentId: true } },
              },
            },
          },
        });
        const seen = new Set<number>();
        students = [];
        for (const r of directRequests) {
          const candidates = r.studentId
            ? r.parent.parentStudents.filter((s) => s.id === r.studentId)
            : r.parent.parentStudents;
          for (const s of candidates) {
            if (!seen.has(s.id)) {
              seen.add(s.id);
              students.push({ id: s.id, name: s.name, userId: s.userId, parentId: s.parentId });
            }
          }
        }
      }

      if (students.length === 0) return [];

      const parentIdArr = Array.from(
        new Set(students.map((s) => s.parentId).filter((id): id is number => id != null)),
      );
      const [teacher, parentUsers] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
        prisma.user.findMany({ where: { id: { in: parentIdArr } }, select: { id: true, name: true } }),
      ]);
      if (!teacher) return [];

      const parentNameMap = new Map(parentUsers.map((p) => [p.id, p.name]));
      const groups: ConvGroup[] = students.map((s) => ({
        studentId: s.id,
        teacherUserId: userId,
        studentUserId: s.userId,
        parentUserId: s.parentId,
      }));

      const stats = await fetchThreadStats(groups, userId);
      const threadLabels = students.length > 0 ? await prisma.threadLabel.findMany({
        where: { teacherUserId: userId, studentId: { in: students.map((s) => s.id) } },
        select: { studentId: true, name: true },
      }) : [];
      const labelMap = new Map(threadLabels.map((l) => [l.studentId, l.name]));
      return students.map((s) => ({
        studentId: s.id,
        teacherUserId: userId,
        studentName: s.name,
        teacherName: teacher.name,
        parentName: parentNameMap.get(s.parentId) ?? null,
        customName: labelMap.get(s.id) ?? null,
        ...(stats.get(s.id) ?? { lastMessage: null, lastMessageTimestamp: null, unreadCount: 0 }),
      }));
    }

    if (role === "parent") {
      type TeacherRef = { id: number; name: string };
      const [parentStudents, parentUser, tutorRequests] = await Promise.all([
        prisma.student.findMany({
          where: { parentId: userId },
          select: { id: true, name: true, userId: true, parentId: true },
        }),
        prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
        prisma.tutorRequest.findMany({
          where: { parentId: userId, status: "approved", studentId: { not: null } },
          select: { studentId: true, teacher: { select: { id: true, name: true } } },
        }),
      ]);

      if (parentStudents.length === 0) return [];

      const teacherMap = new Map<number, TeacherRef>();
      for (const r of tutorRequests) {
        if (r.studentId != null && !teacherMap.has(r.studentId)) teacherMap.set(r.studentId, r.teacher);
      }

      const assignedStudents = parentStudents.filter((s) => teacherMap.has(s.id));
      const unassignedStudents = parentStudents.filter((s) => !teacherMap.has(s.id));

      const groups: ConvGroup[] = assignedStudents.map((s) => ({
        studentId: s.id,
        teacherUserId: teacherMap.get(s.id)?.id ?? 0,
        studentUserId: s.userId,
        parentUserId: userId,
      }));

      const stats = await fetchThreadStats(groups, userId);

      const assignedGroups = assignedStudents.map((s) => ({
        teacherUserId: teacherMap.get(s.id)?.id ?? 0,
        studentId: s.id,
      })).filter((g) => g.teacherUserId !== 0);
      const parentThreadLabels = assignedGroups.length > 0 ? await prisma.threadLabel.findMany({
        where: { OR: assignedGroups },
        select: { teacherUserId: true, studentId: true, name: true },
      }) : [];
      const parentLabelMap = new Map(parentThreadLabels.map((l) => [`${l.teacherUserId}:${l.studentId}`, l.name]));

      const summaries: ConversationSummary[] = assignedStudents.map((s) => {
        const teacher = teacherMap.get(s.id);
        const teacherUserId = teacher?.id ?? 0;
        return {
          studentId: s.id,
          teacherUserId,
          studentName: s.name,
          teacherName: teacher?.name ?? "",
          parentName: parentUser?.name ?? null,
          customName: parentLabelMap.get(`${teacherUserId}:${s.id}`) ?? null,
          ...(stats.get(s.id) ?? { lastMessage: null, lastMessageTimestamp: null, unreadCount: 0 }),
        };
      });

      for (const s of unassignedStudents) {
        summaries.push({
          studentId: s.id,
          teacherUserId: 0,
          studentName: s.name,
          teacherName: "",
          parentName: parentUser?.name ?? null,
          customName: null,
          lastMessage: null,
          lastMessageTimestamp: null,
          unreadCount: 0,
        });
      }

      return summaries;
    }

    if (role === "student") {
      const studentRecord = await prisma.student.findUnique({
        where: { userId },
        select: { id: true, name: true, userId: true, parentId: true },
      });
      if (!studentRecord) return [];

      const [tutorRequest, parentUser] = await Promise.all([
        prisma.tutorRequest.findFirst({
          where: { studentId: studentRecord.id, status: "approved" },
          select: { teacher: { select: { id: true, name: true } } },
        }),
        prisma.user.findUnique({ where: { id: studentRecord.parentId }, select: { name: true } }),
      ]);

      const teacherUser = tutorRequest?.teacher ?? null;
      if (!teacherUser) return [];

      const groups: ConvGroup[] = [{
        studentId: studentRecord.id,
        teacherUserId: teacherUser.id,
        studentUserId: userId,
        parentUserId: studentRecord.parentId,
      }];

      const stats = await fetchThreadStats(groups, userId);
      const studentLabel = await prisma.threadLabel.findUnique({
        where: { teacherUserId_studentId: { teacherUserId: teacherUser.id, studentId: studentRecord.id } },
        select: { name: true },
      });
      return [{
        studentId: studentRecord.id,
        teacherUserId: teacherUser.id,
        studentName: studentRecord.name,
        teacherName: teacherUser.name,
        parentName: parentUser?.name ?? null,
        customName: studentLabel?.name ?? null,
        ...(stats.get(studentRecord.id) ?? { lastMessage: null, lastMessageTimestamp: null, unreadCount: 0 }),
      }];
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

  async getStudentInviteByCode(code: string): Promise<StudentInvite | null> {
    return (await prisma.studentInvite.findUnique({
      where: { code },
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

  async deleteStudentInviteById(id: number): Promise<void> {
    await prisma.studentInvite.delete({ where: { id } });
  }

  async getAllUsers(): Promise<(User & { createdAt: Date | null })[]> {
    return (await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
        googleId: true,
        profilePicture: true,
        isAdmin: true,
        isSuperAdmin: true,
        createdAt: true,
        // Exclude password and emailVerifyToken for security
      },
    })) as unknown as (User & { createdAt: Date | null })[];
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

  // Selects the teacher with fewest approved TutorRequests (load-balancing) and
  // returns their userId. Does NOT write any records — callers create TutorRequest.
  async findFirstAvailableTeacherId(studentId: number): Promise<number | null> {
    const teachers = await prisma.user.findMany({
      where: { role: "teacher" },
      select: {
        id: true,
        _count: { select: { tutorRequests: { where: { status: "approved" } } } },
      },
    });
    if (teachers.length === 0) return null;
    // Exclude teachers already linked to this student via approved TutorRequest
    const existing = await prisma.tutorRequest.findFirst({
      where: { studentId, status: "approved" },
    });
    if (existing) return existing.teacherId;
    teachers.sort((a, b) => a._count.tutorRequests - b._count.tutorRequests);
    return teachers[0].id;
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

  async getThreadLabel(teacherUserId: number, studentId: number): Promise<string | null> {
    const label = await prisma.threadLabel.findUnique({
      where: { teacherUserId_studentId: { teacherUserId, studentId } },
      select: { name: true },
    });
    return label?.name ?? null;
  }

  async setThreadLabel(teacherUserId: number, studentId: number, name: string | null): Promise<void> {
    if (name === null || name.trim() === "") {
      await prisma.threadLabel.deleteMany({
        where: { teacherUserId, studentId },
      });
    } else {
      await prisma.threadLabel.upsert({
        where: { teacherUserId_studentId: { teacherUserId, studentId } },
        create: { teacherUserId, studentId, name: name.trim() },
        update: { name: name.trim() },
      });
    }
  }

  // ─── Classrooms ────────────────────────────────────────────────────────

  private mapClassroom(c: any): Classroom {
    return {
      id: c.id,
      name: c.name,
      subject: c.subject,
      description: c.description ?? null,
      teacherId: c.teacherId,
      status: c.status as "active" | "archived",
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
      slug: c.slug ?? null,
    };
  }

  async createClassroom(data: InsertClassroom): Promise<Classroom> {
    const c = await prisma.classroom.create({ data });
    const slug = slugify(c.name, c.id);
    const updated = await prisma.classroom.update({ where: { id: c.id }, data: { slug } });
    return this.mapClassroom(updated);
  }

  async getClassroomBySlug(slug: string): Promise<Classroom | null> {
    const c = await prisma.classroom.findUnique({ where: { slug } });
    return c ? this.mapClassroom(c) : null;
  }

  async getClassroomById(id: number): Promise<Classroom | null> {
    const c = await prisma.classroom.findUnique({ where: { id } });
    return c ? this.mapClassroom(c) : null;
  }

  async getClassroomsByTeacher(teacherId: number): Promise<Classroom[]> {
    const rows = await prisma.classroom.findMany({
      where: { teacherId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(this.mapClassroom.bind(this));
  }

  async getClassroomsForStudent(studentId: number): Promise<Classroom[]> {
    const enrollments = await prisma.classroomEnrollment.findMany({
      where: { studentId },
      include: { classroom: true },
      orderBy: { enrolledAt: "desc" },
    });
    return enrollments.map((e) => this.mapClassroom(e.classroom));
  }

  async getClassroomsForParent(studentId: number): Promise<Classroom[]> {
    return this.getClassroomsForStudent(studentId);
  }

  async updateClassroom(id: number, data: Partial<InsertClassroom>): Promise<Classroom> {
    const c = await prisma.classroom.update({ where: { id }, data });
    return this.mapClassroom(c);
  }

  async deleteClassroom(id: number): Promise<void> {
    await prisma.classroom.delete({ where: { id } });
  }

  async enrollStudent(classroomId: number, studentId: number): Promise<ClassroomEnrollment> {
    const enrollment = await prisma.classroomEnrollment.create({
      data: { classroomId, studentId },
    });
    // Auto-create pending submissions for all existing assignments
    const assignments = await prisma.classroomAssignment.findMany({ where: { classroomId } });
    for (const a of assignments) {
      await prisma.classroomSubmission.upsert({
        where: { assignmentId_studentId: { assignmentId: a.id, studentId } },
        create: { assignmentId: a.id, studentId, status: "pending" },
        update: {},
      });
    }
    return {
      id: enrollment.id,
      classroomId: enrollment.classroomId,
      studentId: enrollment.studentId,
      enrolledAt: enrollment.enrolledAt instanceof Date ? enrollment.enrolledAt.toISOString() : enrollment.enrolledAt,
    };
  }

  async unenrollStudent(classroomId: number, studentId: number): Promise<void> {
    await prisma.classroomEnrollment.deleteMany({ where: { classroomId, studentId } });
  }

  async getEnrollments(classroomId: number): Promise<(ClassroomEnrollment & { student: { id: number; name: string; userId: number } })[]> {
    const rows = await prisma.classroomEnrollment.findMany({
      where: { classroomId },
      include: { student: { select: { id: true, name: true, userId: true } } },
      orderBy: { enrolledAt: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      classroomId: r.classroomId,
      studentId: r.studentId,
      enrolledAt: r.enrolledAt instanceof Date ? r.enrolledAt.toISOString() : r.enrolledAt,
      student: r.student,
    }));
  }

  async createClassroomPost(data: InsertClassroomPost & { authorName?: string }): Promise<ClassroomPost & { authorName: string }> {
    const post = await prisma.classroomPost.create({
      data: { classroomId: data.classroomId, authorId: data.authorId, content: data.content },
      include: { author: { select: { name: true } } },
    });
    return {
      id: post.id,
      classroomId: post.classroomId,
      authorId: post.authorId,
      content: post.content,
      createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : post.createdAt,
      authorName: (post as any).author?.name ?? "Unknown",
    };
  }

  async getClassroomPosts(classroomId: number): Promise<(ClassroomPost & { authorName: string })[]> {
    const posts = await prisma.classroomPost.findMany({
      where: { classroomId },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return posts.map((p) => ({
      id: p.id,
      classroomId: p.classroomId,
      authorId: p.authorId,
      content: p.content,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
      authorName: (p as any).author?.name ?? "Unknown",
    }));
  }

  private mapClassroomAssignment(a: any): ClassroomAssignment {
    return {
      id: a.id,
      classroomId: a.classroomId,
      title: a.title,
      description: a.description,
      dueDate: a.dueDate,
      points: a.points,
      fileUrl: a.fileUrl ?? null,
      slug: a.slug ?? null,
      createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
    };
  }

  async createClassroomAssignment(data: InsertClassroomAssignment): Promise<ClassroomAssignment> {
    const a = await prisma.classroomAssignment.create({ data });
    const slug = slugify(a.title, a.id);
    const updated = await prisma.classroomAssignment.update({ where: { id: a.id }, data: { slug } });
    // Auto-create pending submissions for all currently enrolled students
    const enrollments = await prisma.classroomEnrollment.findMany({ where: { classroomId: data.classroomId } });
    for (const e of enrollments) {
      await prisma.classroomSubmission.upsert({
        where: { assignmentId_studentId: { assignmentId: a.id, studentId: e.studentId } },
        create: { assignmentId: a.id, studentId: e.studentId, status: "pending" },
        update: {},
      });
    }
    return this.mapClassroomAssignment(updated);
  }

  async getClassroomAssignments(classroomId: number): Promise<ClassroomAssignment[]> {
    const rows = await prisma.classroomAssignment.findMany({
      where: { classroomId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((a) => this.mapClassroomAssignment(a));
  }

  async getClassroomAssignmentBySlug(classroomId: number, slug: string): Promise<ClassroomAssignment | null> {
    const a = await prisma.classroomAssignment.findFirst({ where: { classroomId, slug } });
    return a ? this.mapClassroomAssignment(a) : null;
  }

  async getClassroomAssignmentById(classroomId: number, id: number): Promise<ClassroomAssignment | null> {
    const a = await prisma.classroomAssignment.findFirst({ where: { classroomId, id } });
    return a ? this.mapClassroomAssignment(a) : null;
  }

  async deleteClassroomAssignment(id: number): Promise<void> {
    await prisma.classroomAssignment.delete({ where: { id } });
  }

  async getSubmissionsForAssignment(assignmentId: number): Promise<(ClassroomSubmission & { studentName: string })[]> {
    const rows = await prisma.classroomSubmission.findMany({
      where: { assignmentId },
      include: { student: { select: { name: true } } },
      orderBy: { studentId: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      assignmentId: r.assignmentId,
      studentId: r.studentId,
      content: r.content ?? null,
      fileUrl: r.fileUrl ?? null,
      status: r.status as any,
      submittedAt: r.submittedAt ?? null,
      grade: r.grade ?? null,
      feedback: r.feedback ?? null,
      studentName: (r as any).student?.name ?? "Unknown",
    }));
  }

  async getSubmissionsForStudent(studentId: number, classroomId: number): Promise<ClassroomSubmission[]> {
    const assignments = await prisma.classroomAssignment.findMany({ where: { classroomId }, select: { id: true } });
    const assignmentIds = assignments.map((a) => a.id);
    const rows = await prisma.classroomSubmission.findMany({
      where: { studentId, assignmentId: { in: assignmentIds } },
    });
    return rows.map((r) => ({
      id: r.id,
      assignmentId: r.assignmentId,
      studentId: r.studentId,
      content: r.content ?? null,
      fileUrl: r.fileUrl ?? null,
      status: r.status as any,
      submittedAt: r.submittedAt ?? null,
      grade: r.grade ?? null,
      feedback: r.feedback ?? null,
    }));
  }

  async getClassroomNotificationsForStudent(studentId: number): Promise<Record<number, {
    newCount: number;
    dueCount: number;
    dueSoonCount: number;
    total: number;
  }>> {
    type EnrollmentRow = Prisma.ClassroomEnrollmentGetPayload<{
      include: {
        classroom: {
          include: {
            assignments: {
              include: { submissions: true };
            };
            materials: { select: { id: true; assignmentId: true; uploadedAt: true } };
            posts: { select: { id: true; createdAt: true } };
          };
        };
      };
    }>;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const enrollments: EnrollmentRow[] = await prisma.classroomEnrollment.findMany({
      where: { studentId },
      include: {
        classroom: {
          include: {
            assignments: {
              include: { submissions: { where: { studentId } } },
            },
            materials: { select: { id: true, assignmentId: true, uploadedAt: true } },
            posts: { select: { id: true, createdAt: true } },
          },
        },
      },
    });

    const result: Record<number, { pendingCount: number; newMaterialsCount: number; newPostsCount: number; newCount: number; dueCount: number; dueSoonCount: number; total: number }> = {};

    for (const enrollment of enrollments) {
      const classroom = enrollment.classroom;
      if (classroom.status === "archived") {
        result[classroom.id] = { pendingCount: 0, newMaterialsCount: 0, newPostsCount: 0, newCount: 0, dueCount: 0, dueSoonCount: 0, total: 0 };
        continue;
      }

      let pendingCount = 0;
      let newCount = 0;
      let dueCount = 0;
      let dueSoonCount = 0;

      for (const assignment of classroom.assignments) {
        const sub = assignment.submissions[0] ?? null;
        // Skip if already submitted (not pending)
        if (sub && sub.status !== "pending") continue;

        // Count every unsubmitted assignment toward pendingCount
        pendingCount++;

        let classified = false;

        if (assignment.dueDate) {
          const due = new Date(assignment.dueDate);
          if (!isNaN(due.getTime())) {
            due.setHours(0, 0, 0, 0);
            const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
            if (diffDays <= 0) { dueCount++; classified = true; }
            else if (diffDays <= 3) { dueSoonCount++; classified = true; }
          }
        }

        // "New" requires strictly no submission row at all (not even pending)
        if (!classified && !sub) {
          const created = new Date(assignment.createdAt);
          if (created >= sevenDaysAgo) newCount++;
        }
      }

      // Count new classwork materials (without linked assignment) uploaded in the last 7 days
      const newMaterialsCount = classroom.materials.filter((m) => {
        if (m.assignmentId) return false; // linked materials count via assignment pendingCount
        return new Date(m.uploadedAt) >= sevenDaysAgo;
      }).length;

      // Count new feed posts created in the last 7 days
      const newPostsCount = classroom.posts.filter((p) => new Date(p.createdAt) >= sevenDaysAgo).length;

      const total = newCount + dueCount + dueSoonCount;
      result[classroom.id] = { pendingCount: pendingCount + newMaterialsCount + newPostsCount, newMaterialsCount, newPostsCount, newCount, dueCount, dueSoonCount, total };
    }

    return result;
  }

  async getTeacherClassroomStats(userId: number): Promise<Record<number, { toGradeCount: number }>> {
    const classrooms = await prisma.classroom.findMany({
      where: { teacherId: userId },
      include: {
        assignments: {
          include: {
            submissions: {
              where: { status: { in: ["submitted", "late"] }, grade: null },
              select: { id: true },
            },
          },
        },
      },
    });

    const result: Record<number, { toGradeCount: number }> = {};
    for (const classroom of classrooms) {
      const toGradeCount = classroom.assignments.reduce((sum, a) => sum + a.submissions.length, 0);
      result[classroom.id] = { toGradeCount };
    }
    return result;
  }

  async submitClassroomAssignment(assignmentId: number, studentId: number, content: string, dueDate: string, fileUrl?: string): Promise<ClassroomSubmission> {
    const now = new Date().toISOString();
    const isLate = now > dueDate;
    const submitData = { content, fileUrl: fileUrl ?? null, status: isLate ? "late" : "submitted", submittedAt: now };
    const updated = await prisma.classroomSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      update: submitData,
      create: { assignmentId, studentId, grade: null, feedback: null, ...submitData },
    });
    return {
      id: updated.id,
      assignmentId: updated.assignmentId,
      studentId: updated.studentId,
      content: updated.content ?? null,
      fileUrl: updated.fileUrl ?? null,
      status: updated.status as any,
      submittedAt: updated.submittedAt ?? null,
      grade: updated.grade ?? null,
      feedback: updated.feedback ?? null,
    };
  }

  async gradeClassroomSubmission(submissionId: number, grade: number, feedback: string | null, maxPoints: number): Promise<ClassroomSubmission> {
    const clampedGrade = Math.max(0, Math.min(grade, maxPoints));
    const updated = await prisma.classroomSubmission.update({
      where: { id: submissionId },
      data: { grade: clampedGrade, feedback, status: "graded" },
    });
    return {
      id: updated.id,
      assignmentId: updated.assignmentId,
      studentId: updated.studentId,
      content: updated.content ?? null,
      fileUrl: updated.fileUrl ?? null,
      status: updated.status as any,
      submittedAt: updated.submittedAt ?? null,
      grade: updated.grade ?? null,
      feedback: updated.feedback ?? null,
    };
  }

  private mapClassroomMaterial(m: any): ClassroomMaterial {
    return {
      id: m.id,
      classroomId: m.classroomId,
      title: m.title,
      description: m.description,
      url: m.url ?? null,
      assignmentId: m.assignmentId ?? null,
      slug: m.slug ?? null,
      uploadedAt: m.uploadedAt instanceof Date ? m.uploadedAt.toISOString() : m.uploadedAt,
      linkedAssignment: m.assignment
        ? { id: m.assignment.id, title: m.assignment.title, slug: m.assignment.slug ?? null }
        : null,
    };
  }

  async createClassroomMaterial(data: InsertClassroomMaterial): Promise<ClassroomMaterial> {
    const m = await prisma.classroomMaterial.create({ data, include: { assignment: { select: { id: true, title: true, slug: true } } } });
    const slug = slugify(m.title, m.id);
    const updated = await prisma.classroomMaterial.update({ where: { id: m.id }, data: { slug }, include: { assignment: { select: { id: true, title: true, slug: true } } } });
    return this.mapClassroomMaterial(updated);
  }

  async getClassroomMaterials(classroomId: number): Promise<ClassroomMaterial[]> {
    const rows = await prisma.classroomMaterial.findMany({
      where: { classroomId },
      orderBy: { uploadedAt: "desc" },
      include: { assignment: { select: { id: true, title: true, slug: true } } },
    });
    return rows.map((m) => this.mapClassroomMaterial(m));
  }

  async updateClassroomMaterial(id: number, data: Partial<InsertClassroomMaterial>): Promise<ClassroomMaterial> {
    const updated = await prisma.classroomMaterial.update({
      where: { id },
      data,
      include: { assignment: { select: { id: true, title: true, slug: true } } },
    });
    return this.mapClassroomMaterial(updated);
  }

  async deleteClassroomMaterial(id: number): Promise<void> {
    await prisma.classroomMaterial.delete({ where: { id } });
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  async createNotification(data: { userId: number; type: string; title: string; body: string; link?: string }): Promise<any> {
    // Dedup guard: skip if an identical unread notification was created in the last 60 seconds
    const recent = await prisma.notification.findFirst({
      where: {
        userId: data.userId,
        type: data.type,
        body: data.body,
        isRead: false,
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
    });
    if (recent) return recent;
    return prisma.notification.create({ data });
  }

  async getNotificationsForUser(userId: number, limit = 20): Promise<any[]> {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    return prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markNotificationRead(id: number, userId: number): Promise<any> {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}

export const storage = new PrismaStorage();
