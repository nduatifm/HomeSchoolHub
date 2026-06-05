import prisma from "./db";
import { Prisma } from "@prisma/client";
import { slugify } from "../shared/slugify";
import type {
  User,
  InsertUser,
  Student,
  InsertStudent,
  ChildTeamMember,
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
  GradeFolder,
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

export type TeamInviteInfo = ChildTeamMember & {
  childName: string | null;
  childGradeLevel: string | null;
};

export type ConversationSummary = {
  type: "student" | "direct";
  studentId: number;
  teacherUserId: number;
  studentName: string;
  teacherName: string;
  parentName: string | null;
  lastMessage: string | null;
  lastMessageTimestamp: string | null;
  unreadCount: number;
  customName: string | null;
  isReadOnly: boolean;
  otherUserId?: number;
  otherUserName?: string;
};

export interface IStorage {
  createUser(user: Prisma.UserCreateInput): Promise<User>;
  getUserById(id: number): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  getUserByEmailVerifyToken(token: string): Promise<User | null>;
  getUserByPasswordResetToken(token: string): Promise<User | null>;
  getUserByGoogleId(googleId: string): Promise<User | null>;
  updateUser(id: number, user: Prisma.UserUpdateInput): Promise<User>;

  createStudent(student: InsertStudent): Promise<Student>;
  getStudentById(id: number): Promise<Student | null>;
  getStudentByUserId(userId: number): Promise<Student | null>;
  getStudentsByParent(
    parentId: number,
  ): Promise<(Student & { email?: string; callerRole?: string; ownerName?: string | null })[]>;
  getStudentsByTeacher(
    teacherId: number,
  ): Promise<(Student & { email?: string })[]>;
  updateStudent(
    id: number,
    student: Prisma.StudentUpdateInput,
  ): Promise<Student>;

  // Family team management
  getChildTeam(studentId: number): Promise<ChildTeamMember[]>;
  getTeamMemberUserIds(studentId: number): Promise<number[]>;
  getTeamOwnerUserIds(studentId: number): Promise<number[]>;
  isTeamMember(userId: number, studentId: number): Promise<boolean>;
  isTeamOwner(userId: number, studentId: number): Promise<boolean>;
  countTeamOwners(studentId: number): Promise<number>;
  createChildTeamMember(data: {
    childId: number;
    parentId?: number | null;
    role?: string;
    status?: string;
    invitedBy?: number | null;
    inviteToken?: string | null;
    inviteEmail?: string | null;
    inviteExpiresAt?: Date | null;
    acceptedAt?: Date | null;
  }): Promise<ChildTeamMember>;
  getTeamInviteByToken(token: string): Promise<TeamInviteInfo | null>;
  acceptTeamInvite(token: string, userId: number): Promise<ChildTeamMember>;
  removeTeamMember(id: number): Promise<void>;
  updateTeamMemberRole(id: number, role: string): Promise<ChildTeamMember>;

  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  getAssignmentById(id: number): Promise<Assignment | null>;
  getAssignmentsByTeacher(teacherId: number): Promise<Assignment[]>;
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
  getDirectMessages(userIdA: number, userIdB: number): Promise<(Message & { senderName?: string })[]>;
  createDirectMessage(senderId: number, receiverId: number, message: string): Promise<Message>;
  getDirectContacts(userId: number, role: string): Promise<{ id: number; name: string }[]>;

  createProgressReport(report: InsertProgressReport): Promise<ProgressReport>;
  getProgressReportById(id: number): Promise<(ProgressReport & { studentName?: string; teacherName?: string }) | null>;
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
  createEarnings(earnings: InsertEarnings): Promise<Earnings>;
  getEarningsByTeacher(teacherId: number): Promise<Earnings[]>;

  createStudentInvite(
    invite: Prisma.StudentInviteCreateInput,
  ): Promise<StudentInvite>;
  getStudentInviteByCode(code: string): Promise<StudentInvite | null>;
  getPendingStudentInviteByEmail(email: string): Promise<StudentInvite | null>;
  getStudentInvitesByParent(parentId: number): Promise<StudentInvite[]>;
  updateStudentInvite(
    id: number,
    invite: Prisma.StudentInviteUpdateInput,
  ): Promise<StudentInvite>;
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
  getAllStudentsForTeachers(): Promise<(Student & { email?: string })[]>;
  findFirstAvailableTeacherId(studentId: number): Promise<number | null>;

  setThreadLabel(teacherUserId: number, studentId: number, name: string | null): Promise<void>;

  // ─── Grade Folders ───────────────────────────────────────────────────────
  createGradeFolder(teacherId: number, name: string): Promise<GradeFolder>;
  getGradeFoldersByTeacher(teacherId: number): Promise<GradeFolder[]>;
  updateGradeFolder(id: number, name: string): Promise<GradeFolder>;
  deleteGradeFolder(id: number): Promise<void>;

  // ─── Classrooms ──────────────────────────────────────────────────────────
  createClassroom(data: InsertClassroom): Promise<Classroom>;
  getClassroomById(id: number): Promise<Classroom | null>;
  getClassroomBySlug(slug: string): Promise<Classroom | null>;
  getClassroomsByTeacher(teacherId: number): Promise<Classroom[]>;
  getClassroomsForStudent(studentId: number): Promise<Classroom[]>;
  getClassroomsForParent(studentId: number): Promise<Classroom[]>;
  updateClassroom(id: number, data: Partial<InsertClassroom>): Promise<Classroom>;
  softDeleteClassroom(id: number): Promise<void>;
  getSoftDeletedClassroomById(id: number): Promise<(Classroom & { deletedAt: Date | null }) | null>;
  getDeletedClassroomsByTeacher(teacherId: number): Promise<(Classroom & { deletedAt: Date })[]>;
  restoreClassroom(id: number): Promise<void>;
  hardDeleteClassroom(id: number): Promise<void>;
  purgeExpiredSoftDeletes(cutoffDate: Date): Promise<void>;

  enrollStudent(classroomId: number, studentId: number): Promise<ClassroomEnrollment>;
  unenrollStudent(classroomId: number, studentId: number): Promise<void>;
  getEnrollments(classroomId: number): Promise<(ClassroomEnrollment & { student: { id: number; name: string; userId: number } })[]>;

  createClassroomPost(data: InsertClassroomPost & { authorName?: string }): Promise<ClassroomPost & { authorName: string }>;
  getClassroomPosts(classroomId: number): Promise<(ClassroomPost & { authorName: string })[]>;

  createClassroomAssignment(data: InsertClassroomAssignment, materialIds?: number[]): Promise<ClassroomAssignment>;
  getClassroomAssignments(classroomId: number): Promise<ClassroomAssignment[]>;
  getClassroomAssignmentBySlug(classroomId: number, slug: string): Promise<ClassroomAssignment | null>;
  getClassroomAssignmentById(classroomId: number, id: number): Promise<ClassroomAssignment | null>;
  updateClassroomAssignment(id: number, data: Partial<Pick<InsertClassroomAssignment, "title" | "description" | "dueDate" | "points" | "assignmentType" | "fileUrl" | "linkUrl" | "formSchema" | "answerKey">>, materialIds?: number[]): Promise<ClassroomAssignment>;
  deleteClassroomAssignment(id: number): Promise<void>;
  setAssignmentMaterials(assignmentId: number, materialIds: number[]): Promise<void>;

  getSubmissionsForAssignment(assignmentId: number): Promise<(ClassroomSubmission & { studentName: string })[]>;
  getClassroomSubmissionById(submissionId: number): Promise<(ClassroomSubmission & { studentName: string; assignment: ClassroomAssignment }) | null>;
  getSubmissionsForStudent(studentId: number, classroomId: number): Promise<ClassroomSubmission[]>;
  submitClassroomAssignment(assignmentId: number, studentId: number, content: string, dueDate: string, fileUrl?: string, formAnswers?: Record<string, string | string[]>, autoGrade?: number | null): Promise<ClassroomSubmission>;
  gradeClassroomSubmission(submissionId: number, grade: number, feedback: string | null, maxPoints: number): Promise<ClassroomSubmission>;
  returnClassroomSubmission(submissionId: number, returnNote: string): Promise<ClassroomSubmission>;

  createClassroomMaterial(data: InsertClassroomMaterial): Promise<ClassroomMaterial>;
  getClassroomMaterials(classroomId: number): Promise<ClassroomMaterial[]>;
  updateClassroomMaterial(id: number, data: Partial<InsertClassroomMaterial>): Promise<ClassroomMaterial>;
  deleteClassroomMaterial(id: number): Promise<void>;

  // ─── Seen content tracking ────────────────────────────────────────────────
  markContentSeen(userId: number, contentType: string, contentId: number): Promise<void>;
  getSeenContentIds(userId: number, contentType: string, contentIds: number[]): Promise<number[]>;

  // ─── Notifications ────────────────────────────────────────────────────────
  createNotification(data: { userId: number; type: string; title: string; body: string; link?: string }): Promise<any>;
  getNotificationsForUser(userId: number, limit?: number): Promise<any[]>;
  markNotificationRead(id: number, userId: number): Promise<any>;
  markAllNotificationsRead(userId: number): Promise<void>;
  tryClaimNotificationEmailSlot(userId: number): Promise<boolean>;

  getClassroomNotificationsForStudent(studentId: number, viewerUserId: number): Promise<Record<number, {
    pendingCount: number;
    newMaterialsCount: number;
    newPostsCount: number;
    newCount: number;
    dueCount: number;
    dueSoonCount: number;
    total: number;
  }>>; // pendingCount = assignments pending + new materials + new posts

  getTeacherClassroomStats(userId: number): Promise<Record<number, { toGradeCount: number }>>;

  // ─── Submission drafts (student) ─────────────────────────────────────────
  upsertSubmissionDraft(studentId: number, assignmentId: number, classroomId: number, content: string, formAnswers?: Record<string, string | string[]> | null): Promise<any>;
  getSubmissionDraft(studentId: number, assignmentId: number): Promise<any | null>;
  deleteSubmissionDraft(studentId: number, assignmentId: number): Promise<void>;

  // ─── Assignment drafts (teacher) ──────────────────────────────────────────
  upsertAssignmentDraft(teacherId: number, classroomId: number, assignmentId: number | null, data: {
    title?: string; description?: string; dueDate?: string; points?: number;
    assignmentType?: string; linkUrl?: string | null;
    formSchema?: any; answerKey?: any; linkedMaterialIds?: number[];
  }): Promise<any>;
  getAssignmentDraft(teacherId: number, classroomId: number, assignmentId: number | null): Promise<any | null>;
  deleteAssignmentDraft(teacherId: number, classroomId: number, assignmentId: number | null): Promise<void>;
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
    if (!email?.trim()) return null;
    return (await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" } },
    })) as User | null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return (await prisma.user.findFirst({
      where: { username: { equals: username.trim(), mode: "insensitive" } },
    })) as User | null;
  }

  async getUserByEmailVerifyToken(token: string): Promise<User | null> {
    return (await prisma.user.findUnique({
      where: { emailVerifyToken: token },
    })) as User | null;
  }

  async getUserByPasswordResetToken(token: string): Promise<User | null> {
    return (await prisma.user.findUnique({
      where: { passwordResetToken: token },
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
    return (await prisma.student.create({
      data: {
        userId: student.userId,
        name: student.name,
        gradeLevel: student.gradeLevel,
        badges: student.badges ?? [],
        points: student.points ?? 0,
      },
    })) as Student;
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
  ): Promise<(Student & { email?: string; callerRole?: string; ownerName?: string | null })[]> {
    const memberships = await prisma.childTeamMember.findMany({
      where: { parentId, status: "active" },
      include: {
        child: { include: { user: true } },
        // Include the owner name if the caller is a member (to show "Shared by X")
      },
    });

    const results = await Promise.all(memberships.map(async (m: any) => {
      let ownerName: string | null = null;
      if (m.role === "member") {
        const ownerMembership = await prisma.childTeamMember.findFirst({
          where: { childId: m.childId, role: "owner", status: "active", parentId: { not: null } },
          include: { parent: { select: { name: true } } },
        });
        ownerName = ownerMembership?.parent?.name ?? null;
      }
      return {
        ...m.child,
        email: m.child.user?.email,
        username: m.child.user?.username ?? null,
        isManaged: m.child.user?.isManaged ?? false,
        googleId: m.child.user?.googleId ?? null,
        callerRole: m.role as string,
        ownerName,
        user: undefined,
      };
    }));

    return results as (Student & { email?: string; callerRole?: string; ownerName?: string | null })[];
  }

  async getStudentsByTeacher(
    teacherId: number,
  ): Promise<(Student & { email?: string; parentName?: string; parentId?: number })[]> {
    const requests = await prisma.tutorRequest.findMany({
      where: { teacherId, status: "approved" },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            // Use the new family team join table instead of the removed parentStudents relation
            childTeamMemberships: {
              where: { status: "active" },
              include: { child: { include: { user: true } } },
            },
          },
        },
      },
    });
    const studentMap = new Map<number, Student & { email?: string; parentName?: string; parentId?: number }>();
    requests.forEach((r) => {
      const parentName = (r.parent as any).name;
      const memberships: any[] = (r.parent as any).childTeamMemberships ?? [];
      if (r.studentId) {
        // Specific student was requested — only include that student
        const m = memberships.find((m: any) => m.childId === r.studentId);
        const s = m?.child;
        if (s && !studentMap.has(s.id)) {
          studentMap.set(s.id, {
            ...s,
            email: s.user?.email,
            parentName,
            parentId: r.parentId,
            user: undefined,
          } as Student & { email?: string; parentName?: string; parentId?: number });
        } else if (!s && r.studentId) {
          // Fallback: look up student directly if not found via team membership
          // (handles edge cases where assignment pre-dates team membership)
        }
      } else {
        // Legacy requests without studentId — include all of parent's students via team
        memberships.forEach((m: any) => {
          const s = m.child;
          if (s && !studentMap.has(s.id)) {
            studentMap.set(s.id, {
              ...s,
              email: s.user?.email,
              parentName,
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
    const teamUserIds = await this.getTeamMemberUserIds(studentId);
    const participantIds = Array.from(new Set([teacherUserId, student.userId, ...teamUserIds]));

    // Prefer the studentId tag for precise thread isolation (set on all new messages).
    // For legacy messages (studentId: null) require that the student's own userId appears
    // as sender or receiver — this prevents teacher↔parent messages from bleeding
    // across threads when the same parent/teacher pair has multiple children.
    const [tagged, legacy] = await Promise.all([
      prisma.message.findMany({
        where: { studentId },
        include: { sender: { select: { name: true } } },
        orderBy: { timestamp: "asc" },
      }),
      prisma.message.findMany({
        where: {
          studentId: null,
          AND: [
            { senderId: { in: participantIds } },
            { receiverId: { in: participantIds } },
            // Anchor to the specific student: the student user must be directly
            // involved so parent↔teacher messages don't bleed into sibling threads.
            { OR: [{ senderId: student.userId }, { receiverId: student.userId }] },
          ],
        },
        include: { sender: { select: { name: true } } },
        orderBy: { timestamp: "asc" },
      }),
    ]);

    // Merge and sort; deduplicate legacy broadcast siblings by (senderId|timestamp|message)
    const seen = new Set<string>();
    const all = [...tagged, ...legacy].sort((a, b) =>
      a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0,
    );
    const deduped = all.filter((m) => {
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
      studentId: m.studentId ?? undefined,
      senderName: m.sender?.name ?? "Deleted user",
    }));
  }

  async getConversationSummaries(userId: number, role: string): Promise<ConversationSummary[]> {
    // ── Direct conversation helper (teacher↔parent, no student anchor) ──────
    const fetchDirectSummaries = async (): Promise<ConversationSummary[]> => {
      const allDirect = await prisma.message.findMany({
        where: {
          conversationType: "direct",
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
        select: {
          senderId: true,
          receiverId: true,
          message: true,
          timestamp: true,
          isRead: true,
          sender: { select: { name: true } },
          receiver: { select: { name: true } },
        },
        orderBy: { timestamp: "desc" },
      });
      if (allDirect.length === 0) return [];

      const unreadMap = new Map<number, number>();
      for (const m of allDirect) {
        if (m.receiverId === userId && !m.isRead) {
          unreadMap.set(m.senderId, (unreadMap.get(m.senderId) ?? 0) + 1);
        }
      }

      const seen = new Set<number>();
      const summaries: ConversationSummary[] = [];
      for (const m of allDirect) {
        const otherId = m.senderId === userId ? m.receiverId : m.senderId;
        const otherName = m.senderId === userId ? m.receiver.name : m.sender.name;
        if (!seen.has(otherId)) {
          seen.add(otherId);
          summaries.push({
            type: "direct",
            studentId: 0,
            teacherUserId: 0,
            studentName: "",
            teacherName: "",
            parentName: null,
            customName: null,
            isReadOnly: false,
            lastMessage: m.message,
            lastMessageTimestamp: m.timestamp,
            unreadCount: unreadMap.get(otherId) ?? 0,
            otherUserId: otherId,
            otherUserName: otherName,
          });
        }
      }
      return summaries;
    };

    type ConvGroup = {
      studentId: number;
      studentUserId: number; // used to anchor legacy queries to prevent cross-thread bleed
      teacherUserId: number;
      participantIds: number[]; // all participants: teacher + student + team parents
    };

    const fetchThreadStats = async (
      groups: ConvGroup[],
      requesterUserId: number,
    ): Promise<Map<number, { lastMessage: string | null; lastMessageTimestamp: string | null; unreadCount: number }>> => {
      const result = new Map<number, { lastMessage: string | null; lastMessageTimestamp: string | null; unreadCount: number }>();
      for (const g of groups) {
        result.set(g.studentId, { lastMessage: null, lastMessageTimestamp: null, unreadCount: 0 });

        const pids = g.participantIds;
        if (pids.length < 2) continue;

        // For tagged messages use studentId for precise isolation.
        // For legacy messages (studentId: null) require that the student's own userId
        // appears as sender or receiver — prevents teacher↔parent messages from
        // bleeding across sibling threads when the same pair has multiple children.
        const legacyStudentFilter = {
          OR: [{ senderId: g.studentUserId }, { receiverId: g.studentUserId }],
        };

        const [taggedLast, legacyLast, taggedUnread, legacyUnread] = await Promise.all([
          prisma.message.findFirst({
            where: { studentId: g.studentId },
            orderBy: { timestamp: "desc" },
            select: { message: true, timestamp: true },
          }),
          prisma.message.findFirst({
            where: {
              studentId: null,
              senderId: { in: pids },
              receiverId: { in: pids },
              ...legacyStudentFilter,
            },
            orderBy: { timestamp: "desc" },
            select: { message: true, timestamp: true },
          }),
          prisma.message.count({
            where: {
              studentId: g.studentId,
              receiverId: requesterUserId,
              isRead: false,
            },
          }),
          prisma.message.count({
            where: {
              studentId: null,
              receiverId: requesterUserId,
              isRead: false,
              senderId: { in: pids },
              ...legacyStudentFilter,
            },
          }),
        ]);

        // Pick whichever tagged/legacy last message is newer
        let lastMsg: { message: string; timestamp: string } | null = null;
        if (taggedLast && legacyLast) {
          lastMsg = taggedLast.timestamp >= legacyLast.timestamp ? taggedLast : legacyLast;
        } else {
          lastMsg = taggedLast ?? legacyLast ?? null;
        }

        result.set(g.studentId, {
          lastMessage: lastMsg?.message ?? null,
          lastMessageTimestamp: lastMsg?.timestamp ? String(lastMsg.timestamp) : null,
          unreadCount: taggedUnread + legacyUnread,
        });
      }
      return result;
    };

    if (role === "teacher") {
      // Get all students assigned to this teacher via approved TutorRequests
      const requests = await prisma.tutorRequest.findMany({
        where: { teacherId: userId, status: "approved", studentId: { not: null } },
      });

      const seen = new Set<number>();
      const studentIds: number[] = [];
      for (const r of requests) {
        if (r.studentId && !seen.has(r.studentId)) {
          seen.add(r.studentId);
          studentIds.push(r.studentId);
        }
      }

      // Fallback: direct-assignment mode uses TeacherStudentAssignment instead of TutorRequest
      if (studentIds.length === 0) {
        const assignments = await prisma.teacherStudentAssignment.findMany({
          where: { teacherId: userId, status: "active" },
          select: { studentId: true },
        });
        for (const a of assignments) {
          if (!seen.has(a.studentId)) {
            seen.add(a.studentId);
            studentIds.push(a.studentId);
          }
        }
      }

      if (studentIds.length === 0) return fetchDirectSummaries();

      const [students, teacher, threadLabels] = await Promise.all([
        prisma.student.findMany({
          where: { id: { in: studentIds } },
          select: { id: true, name: true, userId: true },
        }),
        prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
        prisma.threadLabel.findMany({
          where: { teacherUserId: userId, studentId: { in: studentIds } },
          select: { studentId: true, name: true },
        }),
      ]);
      if (!teacher) return [];

      // Get primary owner for each student (for parentName display)
      const teamMemberships = await prisma.childTeamMember.findMany({
        where: { childId: { in: studentIds }, status: "active", role: "owner", parentId: { not: null } },
        include: { parent: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      });
      // Also fetch all active members (any role) for participant IDs
      const allTeamMemberships = await prisma.childTeamMember.findMany({
        where: { childId: { in: studentIds }, status: "active", parentId: { not: null } },
        select: { childId: true, parentId: true },
        orderBy: { createdAt: "asc" },
      });
      const primaryOwnerMap = new Map<number, { id: number; name: string }>();
      const allTeamUserIdsMap = new Map<number, number[]>();
      for (const m of teamMemberships) {
        if (!primaryOwnerMap.has(m.childId) && m.parentId != null && m.parent != null)
          primaryOwnerMap.set(m.childId, { id: m.parentId, name: m.parent.name });
      }
      for (const m of allTeamMemberships) {
        if (!allTeamUserIdsMap.has(m.childId)) allTeamUserIdsMap.set(m.childId, []);
        if (m.parentId != null) allTeamUserIdsMap.get(m.childId)!.push(m.parentId);
      }

      const labelMap = new Map(threadLabels.map((l) => [l.studentId, l.name]));
      const groups: ConvGroup[] = students.map((s) => ({
        studentId: s.id,
        studentUserId: s.userId,
        teacherUserId: userId,
        participantIds: Array.from(new Set([userId, s.userId, ...(allTeamUserIdsMap.get(s.id) ?? [])])),
      }));

      const stats = await fetchThreadStats(groups, userId);
      const directSummaries = await fetchDirectSummaries();
      return [
        ...students.map((s) => ({
          type: "student" as const,
          studentId: s.id,
          teacherUserId: userId,
          studentName: s.name,
          teacherName: teacher.name,
          parentName: primaryOwnerMap.get(s.id)?.name ?? null,
          customName: labelMap.get(s.id) ?? null,
          isReadOnly: false,
          ...(stats.get(s.id) ?? { lastMessage: null, lastMessageTimestamp: null, unreadCount: 0 }),
        })),
        ...directSummaries,
      ];
    }

    if (role === "parent") {
      type TeacherRef = { id: number; name: string };

      // Fetch memberships first so we have student IDs for the tutor-request lookup.
      // Filtering tutor requests by parentId breaks co-parents (team members) because
      // TutorRequest.parentId is always the team owner's userId, not the co-parent's.
      const memberships = await prisma.childTeamMember.findMany({
        where: { parentId: userId, status: "active" },
        include: { child: { select: { id: true, name: true, userId: true } } },
      });

      const parentStudents = memberships.map((m) => m.child);
      if (parentStudents.length === 0) return fetchDirectSummaries();

      // Map childId → caller's role on that child's team (owner vs member)
      const callerRoleMap = new Map(memberships.map((m) => [m.child.id, m.role as string]));

      const allStudentIds = parentStudents.map((s) => s.id);

      // Fetch user data and tutor requests in parallel, keyed by studentId so both
      // owners and co-parents (members) resolve the correct teacher assignment.
      const [parentUser, tutorRequests] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
        prisma.tutorRequest.findMany({
          where: { studentId: { in: allStudentIds }, status: "approved" },
          select: { studentId: true, teacher: { select: { id: true, name: true } } },
        }),
      ]);

      const teacherMap = new Map<number, TeacherRef>();
      for (const r of tutorRequests) {
        if (r.studentId != null && !teacherMap.has(r.studentId)) teacherMap.set(r.studentId, r.teacher);
      }

      // For each student, get all team member user IDs for thread participant resolution
      const allMemberships = await prisma.childTeamMember.findMany({
        where: { childId: { in: allStudentIds }, status: "active" },
        select: { childId: true, parentId: true },
      });
      const allTeamMap = new Map<number, number[]>();
      for (const m of allMemberships) {
        if (m.parentId == null) continue;
        if (!allTeamMap.has(m.childId)) allTeamMap.set(m.childId, []);
        allTeamMap.get(m.childId)!.push(m.parentId);
      }

      const assignedStudents = parentStudents.filter((s) => teacherMap.has(s.id));
      const unassignedStudents = parentStudents.filter((s) => !teacherMap.has(s.id));

      const assignedGroups = assignedStudents.map((s) => ({
        teacherUserId: teacherMap.get(s.id)?.id ?? 0,
        studentId: s.id,
      })).filter((g) => g.teacherUserId !== 0);
      const parentThreadLabels = assignedGroups.length > 0 ? await prisma.threadLabel.findMany({
        where: { OR: assignedGroups },
        select: { teacherUserId: true, studentId: true, name: true },
      }) : [];
      const parentLabelMap = new Map(parentThreadLabels.map((l) => [`${l.teacherUserId}:${l.studentId}`, l.name]));

      const groups: ConvGroup[] = assignedStudents.map((s) => ({
        studentId: s.id,
        studentUserId: s.userId,
        teacherUserId: teacherMap.get(s.id)?.id ?? 0,
        participantIds: Array.from(new Set([teacherMap.get(s.id)?.id ?? 0, s.userId, ...(allTeamMap.get(s.id) ?? [])])),
      }));

      const stats = await fetchThreadStats(groups, userId);

      const summaries: ConversationSummary[] = assignedStudents.map((s) => {
        const teacher = teacherMap.get(s.id);
        const teacherUserId = teacher?.id ?? 0;
        return {
          type: "student" as const,
          studentId: s.id,
          teacherUserId,
          studentName: s.name,
          teacherName: teacher?.name ?? "",
          parentName: parentUser?.name ?? null,
          customName: parentLabelMap.get(`${teacherUserId}:${s.id}`) ?? null,
          isReadOnly: (callerRoleMap.get(s.id) ?? "owner") === "member",
          ...(stats.get(s.id) ?? { lastMessage: null, lastMessageTimestamp: null, unreadCount: 0 }),
        };
      });

      for (const s of unassignedStudents) {
        summaries.push({
          type: "student" as const,
          studentId: s.id,
          teacherUserId: 0,
          studentName: s.name,
          teacherName: "",
          parentName: parentUser?.name ?? null,
          customName: null,
          isReadOnly: (callerRoleMap.get(s.id) ?? "owner") === "member",
          lastMessage: null,
          lastMessageTimestamp: null,
          unreadCount: 0,
        });
      }

      const directSummaries = await fetchDirectSummaries();
      return [...summaries, ...directSummaries];
    }

    if (role === "student") {
      const studentRecord = await prisma.student.findUnique({
        where: { userId },
        select: { id: true, name: true, userId: true },
      });
      if (!studentRecord) return [];

      const [tutorRequest, primaryOwner] = await Promise.all([
        prisma.tutorRequest.findFirst({
          where: { studentId: studentRecord.id, status: "approved" },
          select: { teacher: { select: { id: true, name: true } } },
        }),
        prisma.childTeamMember.findFirst({
          where: { childId: studentRecord.id, status: "active" },
          include: { parent: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        }),
      ]);

      // Prefer tutorRequest; fallback to direct-assignment (TeacherStudentAssignment)
      let teacherUser: { id: number; name: string } | null = tutorRequest?.teacher ?? null;
      if (!teacherUser) {
        const assignment = await prisma.teacherStudentAssignment.findFirst({
          where: { studentId: studentRecord.id, status: "active" },
          include: { teacher: { select: { id: true, name: true } } },
        });
        if (assignment) teacherUser = { id: assignment.teacher.id, name: assignment.teacher.name };
      }
      if (!teacherUser) return [];

      const teamUserIds = await this.getTeamMemberUserIds(studentRecord.id);
      const groups: ConvGroup[] = [{
        studentId: studentRecord.id,
        studentUserId: studentRecord.userId,
        teacherUserId: teacherUser.id,
        participantIds: Array.from(new Set([teacherUser.id, userId, ...teamUserIds])),
      }];

      const stats = await fetchThreadStats(groups, userId);
      const studentLabel = await prisma.threadLabel.findUnique({
        where: { teacherUserId_studentId: { teacherUserId: teacherUser.id, studentId: studentRecord.id } },
        select: { name: true },
      });
      return [{
        type: "student" as const,
        studentId: studentRecord.id,
        teacherUserId: teacherUser.id,
        studentName: studentRecord.name,
        teacherName: teacherUser.name,
        parentName: primaryOwner?.parent?.name ?? null,
        customName: studentLabel?.name ?? null,
        isReadOnly: false,
        ...(stats.get(studentRecord.id) ?? { lastMessage: null, lastMessageTimestamp: null, unreadCount: 0 }),
      }];
    }

    return [];
  }

  async getDirectMessages(userIdA: number, userIdB: number): Promise<(Message & { senderName?: string })[]> {
    const messages = await prisma.message.findMany({
      where: {
        conversationType: "direct",
        OR: [
          { senderId: userIdA, receiverId: userIdB },
          { senderId: userIdB, receiverId: userIdA },
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
      studentId: m.studentId ?? undefined,
      conversationType: m.conversationType,
      senderName: (m as any).sender?.name ?? "Deleted user",
    }));
  }

  async createDirectMessage(senderId: number, receiverId: number, message: string): Promise<Message> {
    return (await prisma.message.create({
      data: {
        senderId,
        receiverId,
        message,
        timestamp: new Date().toISOString(),
        isRead: false,
        conversationType: "direct",
      },
    })) as Message;
  }

  async getDirectContacts(userId: number, role: string): Promise<{ id: number; name: string }[]> {
    if (role === "teacher") {
      const requests = await prisma.tutorRequest.findMany({
        where: { teacherId: userId, status: "approved", studentId: { not: null } },
        select: { studentId: true },
      });
      let studentIds = Array.from(new Set(requests.map((r) => r.studentId!)));

      // Fallback: direct-assignment mode — find students via TeacherStudentAssignment
      if (studentIds.length === 0) {
        const assignments = await prisma.teacherStudentAssignment.findMany({
          where: { teacherId: userId, status: "active" },
          select: { studentId: true },
        });
        studentIds = Array.from(new Set(assignments.map((a) => a.studentId)));
      }

      if (studentIds.length === 0) return [];
      const members = await prisma.childTeamMember.findMany({
        where: { childId: { in: studentIds }, status: "active", role: "owner", parentId: { not: null } },
        include: { parent: { select: { id: true, name: true } } },
      });
      const seen = new Set<number>();
      const contacts: { id: number; name: string }[] = [];
      for (const m of members) {
        if (m.parentId && m.parent && !seen.has(m.parentId)) {
          seen.add(m.parentId);
          contacts.push({ id: m.parentId, name: m.parent.name });
        }
      }
      return contacts;
    }

    if (role === "parent") {
      const memberships = await prisma.childTeamMember.findMany({
        where: { parentId: userId, status: "active" },
        select: { childId: true },
      });
      const childIds = memberships.map((m) => m.childId);
      if (childIds.length === 0) return [];

      const requests = await prisma.tutorRequest.findMany({
        where: { studentId: { in: childIds }, status: "approved" },
        select: { teacher: { select: { id: true, name: true } } },
      });
      const seen = new Set<number>();
      const contacts: { id: number; name: string }[] = [];
      for (const r of requests) {
        if (!seen.has(r.teacher.id)) {
          seen.add(r.teacher.id);
          contacts.push({ id: r.teacher.id, name: r.teacher.name });
        }
      }

      // Fallback: direct-assignment mode — find teachers via TeacherStudentAssignment
      if (contacts.length === 0) {
        const assignments = await prisma.teacherStudentAssignment.findMany({
          where: { studentId: { in: childIds }, status: "active" },
          include: { teacher: { select: { id: true, name: true } } },
        });
        for (const a of assignments) {
          if (!seen.has(a.teacher.id)) {
            seen.add(a.teacher.id);
            contacts.push({ id: a.teacher.id, name: a.teacher.name });
          }
        }
      }

      return contacts;
    }

    return [];
  }

  async createProgressReport(
    report: InsertProgressReport,
  ): Promise<ProgressReport> {
    return (await prisma.progressReport.create({
      data: report,
    })) as unknown as ProgressReport;
  }

  async getProgressReportById(
    id: number,
  ): Promise<(ProgressReport & { studentName?: string; teacherName?: string }) | null> {
    const report = await prisma.progressReport.findUnique({
      where: { id },
      include: { student: true, teacher: true },
    });
    if (!report) return null;
    return {
      ...(report as any),
      studentName: (report as any).student?.name,
      teacherName: (report as any).teacher?.name,
      student: undefined,
      teacher: undefined,
    } as ProgressReport & { studentName?: string; teacherName?: string };
  }

  async getProgressReportsByStudent(
    studentId: number,
  ): Promise<ProgressReport[]> {
    const reports = await prisma.progressReport.findMany({
      where: { studentId },
      include: { teacher: true },
      orderBy: { date: "desc" },
    });
    return reports.map((r: any) => ({
      ...r,
      teacherName: r.teacher?.name,
      teacher: undefined,
    })) as ProgressReport[];
  }

  async getProgressReportsByTeacher(
    teacherId: number,
  ): Promise<ProgressReport[]> {
    const reports = await prisma.progressReport.findMany({
      where: { teacherId },
      include: { student: true, teacher: true },
      orderBy: { date: "desc" },
    });
    return reports.map((r: any) => ({
      ...r,
      studentName: r.student?.name,
      teacherName: r.teacher?.name,
      student: undefined,
      teacher: undefined,
    })) as ProgressReport[];
  }

  async getProgressReportsByParent(
    parentId: number,
  ): Promise<(ProgressReport & { studentName?: string; teacherName?: string })[]> {
    const memberships = await prisma.childTeamMember.findMany({ where: { parentId } });
    const studentIds = memberships.map((m: any) => m.childId);
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

  async getStudentInviteByCode(code: string): Promise<StudentInvite | null> {
    return (await prisma.studentInvite.findUnique({
      where: { code },
    })) as StudentInvite | null;
  }

  async getPendingStudentInviteByEmail(email: string): Promise<StudentInvite | null> {
    return (await prisma.studentInvite.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" }, status: "pending" },
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

  async getAllStudentsForTeachers(): Promise<(Student & { email?: string; parentName?: string; parentId?: number })[]> {
    const students = await prisma.student.findMany({
      include: {
        user: true,
        // Get the first active owner as the "primary" parent for display purposes
        childTeamMembers: {
          where: { status: "active", role: "owner" },
          take: 1,
          include: { parent: { select: { id: true, name: true } } },
        },
      },
    });
    return students.map((s: any) => {
      const primaryOwner = s.childTeamMembers?.[0];
      return {
        ...s,
        email: s.user?.email,
        parentName: primaryOwner?.parent?.name ?? null,
        parentId: primaryOwner?.parentId ?? null,
        user: undefined,
        childTeamMembers: undefined,
      };
    }) as (Student & { email?: string; parentName?: string; parentId?: number })[];
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
      teacherName: c.teacher?.name ?? null,
      gradeFolderId: c.gradeFolderId ?? null,
      gradeFolderName: c.gradeFolder?.name ?? null,
      gradeFolder: c.gradeFolderId && c.gradeFolder ? { id: c.gradeFolderId, name: c.gradeFolder.name } : null,
    };
  }

  private mapGradeFolder(f: any): GradeFolder {
    return {
      id: f.id,
      name: f.name,
      teacherId: f.teacherId,
      slug: f.slug ?? null,
      createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : f.createdAt,
      classrooms: f.classrooms
        ? f.classrooms.map((c: any) => ({
            id: c.id,
            name: c.name,
            subject: c.subject,
            description: c.description ?? null,
            slug: c.slug ?? null,
            status: c.status as "active" | "archived",
          }))
        : undefined,
    };
  }

  async createGradeFolder(teacherId: number, name: string): Promise<GradeFolder> {
    const f = await prisma.gradeFolder.create({ data: { name, teacherId } });
    const slug = slugify(name, f.id);
    const updated = await prisma.gradeFolder.update({ where: { id: f.id }, data: { slug } });
    return this.mapGradeFolder(updated);
  }

  async getGradeFoldersByTeacher(teacherId: number): Promise<GradeFolder[]> {
    const rows = await prisma.gradeFolder.findMany({
      where: { teacherId },
      orderBy: { createdAt: "asc" },
      include: {
        classrooms: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    return rows.map(this.mapGradeFolder.bind(this));
  }

  async updateGradeFolder(id: number, name: string): Promise<GradeFolder> {
    const f = await prisma.gradeFolder.update({ where: { id }, data: { name } });
    return this.mapGradeFolder(f);
  }

  async deleteGradeFolder(id: number): Promise<void> {
    await prisma.gradeFolder.delete({ where: { id } });
  }

  async createClassroom(data: InsertClassroom): Promise<Classroom> {
    const c = await prisma.classroom.create({ data });
    const slug = slugify(c.name, c.id);
    const updated = await prisma.classroom.update({
      where: { id: c.id },
      data: { slug },
      include: { gradeFolder: { select: { name: true } } },
    });
    return this.mapClassroom(updated);
  }

  async getClassroomBySlug(slug: string): Promise<Classroom | null> {
    const c = await prisma.classroom.findFirst({
      where: { slug, deletedAt: null },
      include: { gradeFolder: { select: { name: true } } },
    });
    return c ? this.mapClassroom(c) : null;
  }

  async getClassroomById(id: number): Promise<Classroom | null> {
    const c = await prisma.classroom.findFirst({
      where: { id, deletedAt: null },
      include: { gradeFolder: { select: { name: true } } },
    });
    return c ? this.mapClassroom(c) : null;
  }

  async getSoftDeletedClassroomById(id: number): Promise<(Classroom & { deletedAt: Date | null }) | null> {
    const c = await prisma.classroom.findUnique({
      where: { id },
      include: { gradeFolder: { select: { name: true } } },
    });
    if (!c || c.deletedAt === null) return null;
    return { ...this.mapClassroom(c), deletedAt: c.deletedAt };
  }

  async getDeletedClassroomsByTeacher(teacherId: number): Promise<(Classroom & { deletedAt: Date })[]> {
    const rows = await prisma.classroom.findMany({
      where: { teacherId, deletedAt: { not: null } },
      include: { gradeFolder: { select: { name: true } } },
      orderBy: { deletedAt: "desc" },
    });
    return rows.map(c => ({ ...this.mapClassroom(c), deletedAt: c.deletedAt! }));
  }

  async getClassroomsByTeacher(teacherId: number): Promise<Classroom[]> {
    const rows = await prisma.classroom.findMany({
      where: { teacherId, deletedAt: null },
      include: { gradeFolder: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(this.mapClassroom.bind(this));
  }

  async getClassroomsForStudent(studentId: number): Promise<Classroom[]> {
    const enrollments = await prisma.classroomEnrollment.findMany({
      where: { studentId, classroom: { deletedAt: null } },
      include: { classroom: { include: { teacher: { select: { name: true } }, gradeFolder: { select: { name: true } } } } },
      orderBy: { enrolledAt: "desc" },
    });
    return enrollments.map((e) => this.mapClassroom(e.classroom));
  }

  async getClassroomsForParent(studentId: number): Promise<Classroom[]> {
    return this.getClassroomsForStudent(studentId);
  }

  async updateClassroom(id: number, data: Partial<InsertClassroom>): Promise<Classroom> {
    const c = await prisma.classroom.update({
      where: { id },
      data,
      include: { gradeFolder: { select: { name: true } } },
    });
    return this.mapClassroom(c);
  }

  async softDeleteClassroom(id: number): Promise<void> {
    await prisma.classroom.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async restoreClassroom(id: number): Promise<void> {
    await prisma.classroom.update({ where: { id }, data: { deletedAt: null } });
  }

  async hardDeleteClassroom(id: number): Promise<void> {
    // Conditional delete: only removes the classroom if it is still soft-deleted,
    // avoiding a race between the timer callback and a near-simultaneous restore.
    await prisma.classroom.deleteMany({ where: { id, deletedAt: { not: null } } });
  }

  async purgeExpiredSoftDeletes(cutoffDate: Date): Promise<void> {
    await prisma.classroom.deleteMany({
      where: { deletedAt: { not: null, lte: cutoffDate } },
    });
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
      assignmentType: (a.assignmentType === "test" ? "test" : "assignment") as "assignment" | "test",
      fileUrl: a.fileUrl ?? null,
      linkUrl: a.linkUrl ?? null,
      slug: a.slug ?? null,
      formSchema: Array.isArray(a.formSchema) ? a.formSchema : null,
      answerKey: a.answerKey && typeof a.answerKey === "object" && !Array.isArray(a.answerKey) ? a.answerKey : null,
      createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
      linkedMaterialIds: Array.isArray(a.materialLinks) ? a.materialLinks.map((l: any) => l.materialId) : [],
    };
  }

  async setAssignmentMaterials(assignmentId: number, materialIds: number[]): Promise<void> {
    await prisma.classroomAssignmentMaterial.deleteMany({ where: { assignmentId } });
    if (materialIds.length > 0) {
      await prisma.classroomAssignmentMaterial.createMany({
        data: materialIds.map((materialId) => ({ assignmentId, materialId })),
        skipDuplicates: true,
      });
    }
  }

  async createClassroomAssignment(data: InsertClassroomAssignment, materialIds?: number[]): Promise<ClassroomAssignment> {
    const { answerKey, formSchema, ...rest } = data;
    const safeFormSchema = formSchema !== undefined ? JSON.parse(JSON.stringify(formSchema)) as Prisma.InputJsonValue : undefined;
    const safeAnswerKey = answerKey !== undefined ? JSON.parse(JSON.stringify(answerKey)) as Prisma.InputJsonValue : undefined;
    const a = await prisma.classroomAssignment.create({
      data: {
        ...rest,
        ...(safeFormSchema !== undefined ? { formSchema: safeFormSchema } : {}),
        ...(safeAnswerKey !== undefined ? { answerKey: safeAnswerKey } : {}),
      },
    });
    const slug = slugify(a.title, a.id);
    await prisma.classroomAssignment.update({ where: { id: a.id }, data: { slug } });
    if (materialIds && materialIds.length > 0) {
      await this.setAssignmentMaterials(a.id, materialIds);
    }
    // Auto-create pending submissions for all currently enrolled students
    const enrollments = await prisma.classroomEnrollment.findMany({ where: { classroomId: data.classroomId } });
    for (const e of enrollments) {
      await prisma.classroomSubmission.upsert({
        where: { assignmentId_studentId: { assignmentId: a.id, studentId: e.studentId } },
        create: { assignmentId: a.id, studentId: e.studentId, status: "pending" },
        update: {},
      });
    }
    const result = await prisma.classroomAssignment.findFirstOrThrow({
      where: { id: a.id },
      include: { materialLinks: { select: { materialId: true } } },
    });
    return this.mapClassroomAssignment(result);
  }

  async getClassroomAssignments(classroomId: number): Promise<ClassroomAssignment[]> {
    const rows = await prisma.classroomAssignment.findMany({
      where: { classroomId },
      orderBy: { createdAt: "desc" },
      include: { materialLinks: { select: { materialId: true } } },
    });
    return rows.map((a) => this.mapClassroomAssignment(a));
  }

  async getClassroomAssignmentBySlug(classroomId: number, slug: string): Promise<ClassroomAssignment | null> {
    const a = await prisma.classroomAssignment.findFirst({
      where: { classroomId, slug },
      include: { materialLinks: { select: { materialId: true } } },
    });
    return a ? this.mapClassroomAssignment(a) : null;
  }

  async getClassroomAssignmentById(classroomId: number, id: number): Promise<ClassroomAssignment | null> {
    const a = await prisma.classroomAssignment.findFirst({
      where: { classroomId, id },
      include: { materialLinks: { select: { materialId: true } } },
    });
    return a ? this.mapClassroomAssignment(a) : null;
  }

  async updateClassroomAssignment(
    id: number,
    data: Partial<Pick<InsertClassroomAssignment, "title" | "description" | "dueDate" | "points" | "assignmentType" | "fileUrl" | "linkUrl" | "formSchema" | "answerKey">>,
    materialIds?: number[],
  ): Promise<ClassroomAssignment> {
    const { formSchema, answerKey, ...rest } = data;
    const safeFormSchema = formSchema !== undefined && formSchema !== null ? JSON.parse(JSON.stringify(formSchema)) as Prisma.InputJsonValue : formSchema ?? undefined;
    const safeAnswerKey = answerKey !== undefined && answerKey !== null ? JSON.parse(JSON.stringify(answerKey)) as Prisma.InputJsonValue : answerKey ?? undefined;
    await prisma.classroomAssignment.update({
      where: { id },
      data: {
        ...rest,
        ...(safeFormSchema !== undefined ? { formSchema: safeFormSchema as Prisma.InputJsonValue | null } : {}),
        ...(safeAnswerKey !== undefined ? { answerKey: safeAnswerKey as Prisma.InputJsonValue | null } : {}),
      } as Prisma.ClassroomAssignmentUpdateInput,
    });
    if (materialIds !== undefined) {
      await this.setAssignmentMaterials(id, materialIds);
    }
    const result = await prisma.classroomAssignment.findFirstOrThrow({
      where: { id },
      include: { materialLinks: { select: { materialId: true } } },
    });
    return this.mapClassroomAssignment(result);
  }

  async deleteClassroomAssignment(id: number): Promise<void> {
    await prisma.classroomAssignment.delete({ where: { id } });
  }

  async getSubmissionsForAssignment(assignmentId: number): Promise<(ClassroomSubmission & { studentName: string })[]> {
    const assignment = await prisma.classroomAssignment.findUnique({
      where: { id: assignmentId },
      select: { classroomId: true },
    });

    const [rows, enrollments] = await Promise.all([
      prisma.classroomSubmission.findMany({
        where: { assignmentId },
        include: { student: { select: { name: true } } },
        orderBy: { studentId: "asc" },
      }),
      assignment
        ? prisma.classroomEnrollment.findMany({
            where: { classroomId: assignment.classroomId },
            include: { student: { select: { id: true, name: true } } },
            orderBy: { student: { name: "asc" } },
          })
        : Promise.resolve([]),
    ]);

    const submittedStudentIds = new Set(rows.map((r) => r.studentId));

    const submissions: (ClassroomSubmission & { studentName: string })[] = rows.map((r) => ({
      id: r.id,
      assignmentId: r.assignmentId,
      studentId: r.studentId,
      content: r.content ?? null,
      fileUrl: r.fileUrl ?? null,
      formAnswers: r.formAnswers ?? null,
      status: r.status as ClassroomSubmission["status"],
      submittedAt: r.submittedAt ?? null,
      grade: r.grade ?? null,
      feedback: r.feedback ?? null,
      returnNote: r.returnNote ?? null,
      studentName: r.student?.name ?? "Unknown",
    }));

    for (const e of enrollments) {
      if (!submittedStudentIds.has(e.student.id)) {
        submissions.push({
          id: -e.student.id,
          assignmentId,
          studentId: e.student.id,
          content: null,
          fileUrl: null,
          formAnswers: null,
          status: "not-submitted" as ClassroomSubmission["status"],
          submittedAt: null,
          grade: null,
          feedback: null,
          returnNote: null,
          studentName: e.student.name,
        });
      }
    }

    return submissions;
  }

  async getClassroomSubmissionById(submissionId: number): Promise<(ClassroomSubmission & { studentName: string; assignment: ClassroomAssignment }) | null> {
    const r = await prisma.classroomSubmission.findUnique({
      where: { id: submissionId },
      include: {
        student: { select: { name: true } },
        assignment: { include: { materialLinks: { select: { materialId: true } } } },
      },
    });
    if (!r) return null;
    return {
      id: r.id,
      assignmentId: r.assignmentId,
      studentId: r.studentId,
      content: r.content ?? null,
      fileUrl: r.fileUrl ?? null,
      formAnswers: r.formAnswers ?? null,
      status: r.status as ClassroomSubmission["status"],
      submittedAt: r.submittedAt ?? null,
      grade: r.grade ?? null,
      feedback: r.feedback ?? null,
      returnNote: r.returnNote ?? null,
      studentName: r.student?.name ?? "Unknown",
      assignment: this.mapClassroomAssignment(r.assignment),
    };
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
      formAnswers: r.formAnswers ?? null,
      status: r.status as ClassroomSubmission["status"],
      submittedAt: r.submittedAt ?? null,
      grade: r.grade ?? null,
      feedback: r.feedback ?? null,
      returnNote: r.returnNote ?? null,
    }));
  }

  async getClassroomNotificationsForStudent(studentId: number, viewerUserId: number): Promise<Record<number, {
    pendingCount: number;
    newMaterialsCount: number;
    newPostsCount: number;
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
            materials: { select: { id: true; assignmentLinks: { select: { assignmentId: true } } } };
            posts: { select: { id: true } };
          };
        };
      };
    }>;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enrollments: EnrollmentRow[] = await prisma.classroomEnrollment.findMany({
      where: { studentId },
      include: {
        classroom: {
          include: {
            assignments: {
              include: { submissions: { where: { studentId } } },
            },
            materials: { select: { id: true, assignmentLinks: { select: { assignmentId: true } } } },
            posts: { select: { id: true } },
          },
        },
      },
    });

    // Collect all content IDs across all classrooms for a single batch lookup
    const allMaterialIds: number[] = [];
    const allPostIds: number[] = [];
    const allAssignmentIds: number[] = [];
    for (const enrollment of enrollments) {
      const cl = enrollment.classroom;
      allMaterialIds.push(...(cl.materials ?? []).filter((m) => !m.assignmentLinks || m.assignmentLinks.length === 0).map((m) => m.id));
      allPostIds.push(...(cl.posts ?? []).map((p) => p.id));
      // For parent viewers only: track assignments they've seen
      if (viewerUserId !== undefined) {
        allAssignmentIds.push(...cl.assignments.map((a) => a.id));
      }
    }

    // Batch-fetch seen IDs for this viewer
    const seenMaterialIds = await this.getSeenContentIds(viewerUserId, "material", allMaterialIds);
    const seenPostIds = await this.getSeenContentIds(viewerUserId, "post", allPostIds);
    const seenMaterialSet = new Set(seenMaterialIds);
    const seenPostSet = new Set(seenPostIds);

    // For parent: also load seen assignment IDs
    const isParentView = viewerUserId !== (
      await prisma.student.findUnique({ where: { id: studentId }, select: { userId: true } })
    )?.userId;
    const seenAssignmentSet = new Set<number>();
    if (isParentView && allAssignmentIds.length > 0) {
      const seenAssignmentIds = await this.getSeenContentIds(viewerUserId, "assignment", allAssignmentIds);
      seenAssignmentIds.forEach((id) => seenAssignmentSet.add(id));
    }

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
        // Skip if submitted, graded, or late — work is done
        // "pending" and "returned" still need student action
        if (sub && sub.status !== "pending" && sub.status !== "returned") continue;

        // For parent viewers: skip assignments they've already seen
        if (isParentView && seenAssignmentSet.has(assignment.id)) continue;

        // Count every unsubmitted (and unseen-by-parent) assignment toward pendingCount
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

        // "New" = no submission and (for student view) created within last 7 days
        if (!classified && !sub) {
          if (isParentView) {
            newCount++; // parents use seen-state filtering above; no time bound needed
          } else {
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);
            if (new Date(assignment.createdAt) >= sevenDaysAgo) newCount++;
          }
        }
      }

      // Count unseen standalone classwork materials (without linked assignment)
      const newMaterialsCount = (classroom.materials ?? []).filter((m) => {
        if (m.assignmentLinks && m.assignmentLinks.length > 0) return false; // linked materials count via assignment pendingCount
        return !seenMaterialSet.has(m.id);
      }).length;

      // Count unseen feed posts
      const newPostsCount = (classroom.posts ?? []).filter((p) => !seenPostSet.has(p.id)).length;

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
              where: { status: { in: ["submitted", "late", "returned"] } },
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

  async submitClassroomAssignment(assignmentId: number, studentId: number, content: string, dueDate: string, fileUrl?: string, formAnswers?: Record<string, string | string[]>, autoGrade?: number | null): Promise<ClassroomSubmission> {
    const now = new Date();
    const dueDatePart = dueDate.includes("T") ? dueDate.split("T")[0] : dueDate;
    const dueDateTime = new Date(dueDatePart + "T23:59:59");
    const status = now > dueDateTime ? "late" : "submitted";
    const baseData = {
      content,
      // Only include fileUrl in the update payload when a new file was actually uploaded.
      // Omitting it preserves the existing fileUrl on resubmissions that don't attach a new file.
      ...(fileUrl !== undefined ? { fileUrl } : {}),
      status,
      submittedAt: now.toISOString(),
      // Intentionally do NOT clear returnNote here — preserving it lets the teacher see
      // on the review page that this was previously returned. The student-facing banner
      // already gates on status === "returned" so the note won't re-appear to them.
      ...(formAnswers !== undefined ? { formAnswers: JSON.parse(JSON.stringify(formAnswers)) as Prisma.InputJsonValue } : {}),
      ...(autoGrade !== undefined && autoGrade !== null ? { grade: autoGrade } : {}),
    } as const;
    const updated = await prisma.classroomSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      update: baseData,
      // On first-time create: explicitly null out fileUrl when no file was uploaded
      create: { assignmentId, studentId, grade: null, feedback: null, fileUrl: null, ...baseData },
    });
    return {
      id: updated.id,
      assignmentId: updated.assignmentId,
      studentId: updated.studentId,
      content: updated.content ?? null,
      fileUrl: updated.fileUrl ?? null,
      formAnswers: updated.formAnswers ?? null,
      status: updated.status as ClassroomSubmission["status"],
      submittedAt: updated.submittedAt ?? null,
      grade: updated.grade ?? null,
      feedback: updated.feedback ?? null,
      returnNote: updated.returnNote ?? null,
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
      formAnswers: (updated.formAnswers as Record<string, string | string[]> | null) ?? null,
      status: updated.status as ClassroomSubmission["status"],
      submittedAt: updated.submittedAt ?? null,
      grade: updated.grade ?? null,
      feedback: updated.feedback ?? null,
      returnNote: updated.returnNote ?? null,
    };
  }

  async returnClassroomSubmission(submissionId: number, returnNote: string): Promise<ClassroomSubmission> {
    const updated = await prisma.classroomSubmission.update({
      where: { id: submissionId },
      data: { status: "returned", returnNote, grade: null },
    });
    return {
      id: updated.id,
      assignmentId: updated.assignmentId,
      studentId: updated.studentId,
      content: updated.content ?? null,
      fileUrl: updated.fileUrl ?? null,
      formAnswers: (updated.formAnswers as Record<string, string | string[]> | null) ?? null,
      status: updated.status as ClassroomSubmission["status"],
      submittedAt: updated.submittedAt ?? null,
      grade: null,
      feedback: updated.feedback ?? null,
      returnNote: updated.returnNote ?? null,
    };
  }

  private mapClassroomMaterial(m: any): ClassroomMaterial {
    return {
      id: m.id,
      classroomId: m.classroomId,
      title: m.title,
      description: m.description,
      url: m.url ?? null,
      attachments: m.attachments ?? [],
      slug: m.slug ?? null,
      uploadedAt: m.uploadedAt instanceof Date ? m.uploadedAt.toISOString() : m.uploadedAt,
      linkedAssignmentIds: Array.isArray(m.assignmentLinks) ? m.assignmentLinks.map((l: any) => l.assignmentId) : [],
    };
  }

  async createClassroomMaterial(data: InsertClassroomMaterial): Promise<ClassroomMaterial> {
    const m = await prisma.classroomMaterial.create({ data, include: { assignmentLinks: { select: { assignmentId: true } } } });
    const slug = slugify(m.title, m.id);
    const updated = await prisma.classroomMaterial.update({ where: { id: m.id }, data: { slug }, include: { assignmentLinks: { select: { assignmentId: true } } } });
    return this.mapClassroomMaterial(updated);
  }

  async getClassroomMaterials(classroomId: number): Promise<ClassroomMaterial[]> {
    const rows = await prisma.classroomMaterial.findMany({
      where: { classroomId },
      orderBy: { uploadedAt: "desc" },
      include: { assignmentLinks: { select: { assignmentId: true } } },
    });
    return rows.map((m) => this.mapClassroomMaterial(m));
  }

  async updateClassroomMaterial(id: number, data: Partial<InsertClassroomMaterial>): Promise<ClassroomMaterial> {
    const { attachments, ...rest } = data;
    const updated = await prisma.classroomMaterial.update({
      where: { id },
      data: {
        ...rest,
        ...(attachments !== undefined ? { attachments: { set: attachments } } : {}),
      },
      include: { assignmentLinks: { select: { assignmentId: true } } },
    });
    return this.mapClassroomMaterial(updated);
  }

  async deleteClassroomMaterial(id: number): Promise<void> {
    await prisma.classroomMaterial.delete({ where: { id } });
  }

  // ─── Seen content tracking ────────────────────────────────────────────────

  async markContentSeen(userId: number, contentType: string, contentId: number): Promise<void> {
    await prisma.classroomContentSeen.upsert({
      where: { userId_contentType_contentId: { userId, contentType, contentId } },
      create: { userId, contentType, contentId },
      update: { seenAt: new Date() },
    });
  }

  async getSeenContentIds(userId: number, contentType: string, contentIds: number[]): Promise<number[]> {
    if (contentIds.length === 0) return [];
    const rows = await prisma.classroomContentSeen.findMany({
      where: { userId, contentType, contentId: { in: contentIds } },
      select: { contentId: true },
    });
    return rows.map((r) => r.contentId);
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

  async getNotificationsForUser(userId: number, limit = 50): Promise<any[]> {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
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

  async tryClaimNotificationEmailSlot(userId: number): Promise<boolean> {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const result = await prisma.user.updateMany({
      where: {
        id: userId,
        emailNotifications: true,
        OR: [
          { lastNotificationEmailAt: null },
          { lastNotificationEmailAt: { lt: cutoff } },
        ],
      },
      data: { lastNotificationEmailAt: new Date() },
    });
    return result.count === 1;
  }

  // ── Family team management ───────────────────────────────────────────────

  private formatTeamMember(m: Prisma.ChildTeamMemberGetPayload<{
    include: {
      parent: { select: { id: true; name: true; email: true } };
      inviter: { select: { id: true; name: true } };
    };
  }>): ChildTeamMember {
    return {
      id: m.id,
      childId: m.childId,
      parentId: m.parentId,
      role: m.role as "owner" | "member",
      status: m.status as "active" | "pending",
      invitedBy: m.invitedBy ?? null,
      inviteToken: m.inviteToken ?? null,
      inviteEmail: m.inviteEmail ?? null,
      inviteExpiresAt: m.inviteExpiresAt ? m.inviteExpiresAt.toISOString() : null,
      invitedAt: m.invitedAt ? m.invitedAt.toISOString() : new Date().toISOString(),
      acceptedAt: m.acceptedAt ? m.acceptedAt.toISOString() : null,
      createdAt: m.createdAt ? m.createdAt.toISOString() : new Date().toISOString(),
      parentName: m.parent?.name ?? null,
      parentEmail: m.parent?.email ?? null,
      inviterName: m.inviter?.name ?? null,
    };
  }

  async getChildTeam(studentId: number): Promise<ChildTeamMember[]> {
    const rows = await prisma.childTeamMember.findMany({
      where: { childId: studentId },
      include: {
        parent: { select: { id: true, name: true, email: true } },
        inviter: { select: { id: true, name: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    });
    return rows.map((m) => this.formatTeamMember(m));
  }

  async getTeamMemberUserIds(studentId: number): Promise<number[]> {
    const rows = await prisma.childTeamMember.findMany({
      where: { childId: studentId, status: "active", parentId: { not: null } },
      select: { parentId: true },
    });
    return rows.map((r) => r.parentId!);
  }

  async getTeamOwnerUserIds(studentId: number): Promise<number[]> {
    const rows = await prisma.childTeamMember.findMany({
      where: { childId: studentId, status: "active", role: "owner", parentId: { not: null } },
      select: { parentId: true },
    });
    return rows.map((r) => r.parentId!);
  }

  async isTeamMember(userId: number, studentId: number): Promise<boolean> {
    const row = await prisma.childTeamMember.findFirst({
      where: { childId: studentId, parentId: userId, status: "active" },
    });
    return row !== null;
  }

  async isTeamOwner(userId: number, studentId: number): Promise<boolean> {
    const row = await prisma.childTeamMember.findFirst({
      where: { childId: studentId, parentId: userId, status: "active", role: "owner" },
    });
    return row !== null;
  }

  async countTeamOwners(studentId: number): Promise<number> {
    return prisma.childTeamMember.count({
      where: { childId: studentId, status: "active", role: "owner" },
    });
  }

  async createChildTeamMember(data: {
    childId: number;
    parentId?: number | null;
    role?: string;
    status?: string;
    invitedBy?: number | null;
    inviteToken?: string | null;
    inviteEmail?: string | null;
    inviteExpiresAt?: Date | null;
    acceptedAt?: Date | null;
  }): Promise<ChildTeamMember> {
    const row = await prisma.childTeamMember.create({
      data: {
        childId: data.childId,
        parentId: data.parentId ?? null,
        role: data.role ?? "owner",
        status: data.status ?? "active",
        invitedBy: data.invitedBy ?? null,
        inviteToken: data.inviteToken ?? null,
        inviteEmail: data.inviteEmail ?? null,
        inviteExpiresAt: data.inviteExpiresAt ?? null,
        acceptedAt: data.acceptedAt ?? null,
      },
      include: {
        parent: { select: { id: true, name: true, email: true } },
        inviter: { select: { id: true, name: true } },
      },
    });
    return this.formatTeamMember(row);
  }

  async getTeamInviteByToken(token: string): Promise<TeamInviteInfo | null> {
    const row = await prisma.childTeamMember.findFirst({
      where: { inviteToken: token, status: "pending" },
      include: {
        parent: { select: { id: true, name: true, email: true } },
        inviter: { select: { id: true, name: true } },
        child: { select: { id: true, name: true, gradeLevel: true } },
      },
    });
    if (!row) return null;
    return {
      ...this.formatTeamMember(row),
      childName: row.child?.name ?? null,
      childGradeLevel: row.child?.gradeLevel ?? null,
    };
  }

  async acceptTeamInvite(token: string, userId: number): Promise<ChildTeamMember> {
    const row = await prisma.childTeamMember.update({
      where: { inviteToken: token },
      data: {
        parentId: userId,
        status: "active",
        acceptedAt: new Date(),
        inviteToken: null,
        inviteExpiresAt: null,
      },
      include: {
        parent: { select: { id: true, name: true, email: true } },
        inviter: { select: { id: true, name: true } },
      },
    });
    return this.formatTeamMember(row);
  }

  async removeTeamMember(id: number): Promise<void> {
    await prisma.childTeamMember.delete({ where: { id } });
  }

  async updateTeamMemberRole(id: number, role: string): Promise<ChildTeamMember> {
    const row = await prisma.childTeamMember.update({
      where: { id },
      data: { role },
      include: {
        parent: { select: { id: true, name: true, email: true } },
        inviter: { select: { id: true, name: true } },
      },
    });
    return this.formatTeamMember(row);
  }

  // ─── Submission drafts (student) ─────────────────────────────────────────

  async upsertSubmissionDraft(studentId: number, assignmentId: number, classroomId: number, content: string, formAnswers?: Record<string, string | string[]> | null): Promise<any> {
    return prisma.submissionDraft.upsert({
      where: { studentId_assignmentId: { studentId, assignmentId } },
      update: { content, formAnswers: formAnswers ?? Prisma.JsonNull },
      create: { studentId, assignmentId, classroomId, content, formAnswers: formAnswers ?? Prisma.JsonNull },
    });
  }

  async getSubmissionDraft(studentId: number, assignmentId: number): Promise<any | null> {
    return prisma.submissionDraft.findUnique({
      where: { studentId_assignmentId: { studentId, assignmentId } },
    });
  }

  async deleteSubmissionDraft(studentId: number, assignmentId: number): Promise<void> {
    await prisma.submissionDraft.deleteMany({ where: { studentId, assignmentId } });
  }

  // ─── Assignment drafts (teacher) ─────────────────────────────────────────

  async upsertAssignmentDraft(teacherId: number, classroomId: number, assignmentId: number | null, data: {
    title?: string; description?: string; dueDate?: string; points?: number;
    assignmentType?: string; linkUrl?: string | null;
    formSchema?: any; answerKey?: any; linkedMaterialIds?: number[];
  }): Promise<any> {
    const where = assignmentId !== null
      ? { teacherId_classroomId_assignmentId: { teacherId, classroomId, assignmentId } }
      : undefined;

    if (assignmentId !== null && where) {
      return prisma.assignmentDraft.upsert({
        where,
        update: { ...data },
        create: { teacherId, classroomId, assignmentId, ...data },
      });
    }
    // For new-assignment drafts (assignmentId = null), use findFirst + update/create
    const existing = await prisma.assignmentDraft.findFirst({
      where: { teacherId, classroomId, assignmentId: null },
    });
    if (existing) {
      return prisma.assignmentDraft.update({ where: { id: existing.id }, data });
    }
    return prisma.assignmentDraft.create({ data: { teacherId, classroomId, assignmentId: null, ...data } });
  }

  async getAssignmentDraft(teacherId: number, classroomId: number, assignmentId: number | null): Promise<any | null> {
    if (assignmentId !== null) {
      return prisma.assignmentDraft.findUnique({
        where: { teacherId_classroomId_assignmentId: { teacherId, classroomId, assignmentId } },
      });
    }
    return prisma.assignmentDraft.findFirst({
      where: { teacherId, classroomId, assignmentId: null },
    });
  }

  async deleteAssignmentDraft(teacherId: number, classroomId: number, assignmentId: number | null): Promise<void> {
    if (assignmentId !== null) {
      await prisma.assignmentDraft.deleteMany({ where: { teacherId, classroomId, assignmentId } });
    } else {
      await prisma.assignmentDraft.deleteMany({ where: { teacherId, classroomId, assignmentId: null } });
    }
  }
}

export const storage = new PrismaStorage();
