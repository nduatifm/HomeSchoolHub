import type {
  User, InsertUser,
  Student, InsertStudent,
  Assignment, InsertAssignment,
  StudentAssignment, InsertStudentAssignment,
  Material, InsertMaterial,
  Schedule, InsertSchedule,
  Session, InsertSession,
  Feedback, InsertFeedback,
  Attendance, InsertAttendance,
  Payment, InsertPayment,
  TutorRequest, InsertTutorRequest,
  Message, InsertMessage,
  ProgressReport, InsertProgressReport,
  Clarification, InsertClarification,
  ParentalControl, InsertParentalControl,
  TutorRating, InsertTutorRating,
  Earnings, InsertEarnings,
  StudentInvite, InsertStudentInvite,
} from "@shared/schema";

export interface IStorage {
  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUserById(id: number): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  
  // Student operations
  createStudent(student: InsertStudent): Promise<Student>;
  getStudentById(id: number): Promise<Student | null>;
  getStudentByUserId(userId: number): Promise<Student | null>;
  getStudentsByParent(parentId: number): Promise<Student[]>;
  getStudentsByTeacher(teacherId: number): Promise<Student[]>;
  updateStudent(id: number, student: Partial<Student>): Promise<Student>;
  
  // Assignment operations
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  getAssignmentById(id: number): Promise<Assignment | null>;
  getAssignmentsByTeacher(teacherId: number): Promise<Assignment[]>;
  getAssignmentsByGradeLevel(gradeLevel: string): Promise<Assignment[]>;
  updateAssignment(id: number, assignment: Partial<Assignment>): Promise<Assignment>;
  deleteAssignment(id: number): Promise<void>;
  
  // Student Assignment operations
  createStudentAssignment(studentAssignment: InsertStudentAssignment): Promise<StudentAssignment>;
  getStudentAssignmentById(id: number): Promise<StudentAssignment | null>;
  getStudentAssignmentsByStudent(studentId: number): Promise<StudentAssignment[]>;
  getStudentAssignmentsByAssignment(assignmentId: number): Promise<StudentAssignment[]>;
  updateStudentAssignment(id: number, studentAssignment: Partial<StudentAssignment>): Promise<StudentAssignment>;
  
  // Material operations
  createMaterial(material: InsertMaterial): Promise<Material>;
  getMaterialById(id: number): Promise<Material | null>;
  getMaterialsByTeacher(teacherId: number): Promise<Material[]>;
  getMaterialsBySubject(subject: string): Promise<Material[]>;
  getMaterialsByGradeLevel(gradeLevel: string): Promise<Material[]>;
  deleteMaterial(id: number): Promise<void>;
  
  // Schedule operations
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  getSchedulesByTeacher(teacherId: number): Promise<Schedule[]>;
  getSchedulesByStudent(studentId: number): Promise<Schedule[]>;
  updateSchedule(id: number, schedule: Partial<Schedule>): Promise<Schedule>;
  deleteSchedule(id: number): Promise<void>;
  
  // Session operations
  createSession(session: InsertSession): Promise<Session>;
  getSessionById(id: number): Promise<Session | null>;
  getSessionsByTeacher(teacherId: number): Promise<Session[]>;
  getSessionsByStudent(studentId: number): Promise<Session[]>;
  updateSession(id: number, session: Partial<Session>): Promise<Session>;
  
  // Feedback operations
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getFeedbackByStudent(studentId: number): Promise<Feedback[]>;
  getFeedbackByTeacher(teacherId: number): Promise<Feedback[]>;
  
  // Attendance operations
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  getAttendanceByStudent(studentId: number): Promise<Attendance[]>;
  getAttendanceBySession(sessionId: number): Promise<Attendance[]>;
  updateAttendance(id: number, attendance: Partial<Attendance>): Promise<Attendance>;
  
  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByParent(parentId: number): Promise<Payment[]>;
  getPaymentsByTeacher(teacherId: number): Promise<Payment[]>;
  updatePayment(id: number, payment: Partial<Payment>): Promise<Payment>;
  
  // Tutor Request operations
  createTutorRequest(request: InsertTutorRequest): Promise<TutorRequest>;
  getTutorRequestById(id: number): Promise<TutorRequest | null>;
  getTutorRequestsByParent(parentId: number): Promise<TutorRequest[]>;
  getTutorRequestsByTeacher(teacherId: number): Promise<TutorRequest[]>;
  updateTutorRequest(id: number, request: Partial<TutorRequest>): Promise<TutorRequest>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesBetweenUsers(user1Id: number, user2Id: number): Promise<Message[]>;
  getMessagesByUser(userId: number): Promise<Message[]>;
  markMessageAsRead(id: number): Promise<Message>;
  
  // Progress Report operations
  createProgressReport(report: InsertProgressReport): Promise<ProgressReport>;
  getProgressReportsByStudent(studentId: number): Promise<ProgressReport[]>;
  getProgressReportsByTeacher(teacherId: number): Promise<ProgressReport[]>;
  
  // Clarification operations
  createClarification(clarification: InsertClarification): Promise<Clarification>;
  getClarificationsByStudent(studentId: number): Promise<Clarification[]>;
  getClarificationsByAssignment(assignmentId: number): Promise<Clarification[]>;
  updateClarification(id: number, clarification: Partial<Clarification>): Promise<Clarification>;
  
  // Parental Control operations
  createParentalControl(control: InsertParentalControl): Promise<ParentalControl>;
  getParentalControlByStudent(studentId: number): Promise<ParentalControl | null>;
  updateParentalControl(id: number, control: Partial<ParentalControl>): Promise<ParentalControl>;
  
  // Tutor Rating operations
  createTutorRating(rating: InsertTutorRating): Promise<TutorRating>;
  getRatingsByTeacher(teacherId: number): Promise<TutorRating[]>;
  getRatingsByParent(parentId: number): Promise<TutorRating[]>;
  
  // Earnings operations
  createEarnings(earnings: InsertEarnings): Promise<Earnings>;
  getEarningsByTeacher(teacherId: number): Promise<Earnings[]>;
  
  // Student Invite operations
  createStudentInvite(invite: InsertStudentInvite): Promise<StudentInvite>;
  getStudentInviteByToken(token: string): Promise<StudentInvite | null>;
  getStudentInvitesByParent(parentId: number): Promise<StudentInvite[]>;
  updateStudentInvite(id: number, invite: Partial<StudentInvite>): Promise<StudentInvite>;
}

// In-memory storage implementation
class MemStorage implements IStorage {
  private users: User[] = [];
  private students: Student[] = [];
  private assignments: Assignment[] = [];
  private studentAssignments: StudentAssignment[] = [];
  private materials: Material[] = [];
  private schedules: Schedule[] = [];
  private sessions: Session[] = [];
  private feedbacks: Feedback[] = [];
  private attendances: Attendance[] = [];
  private payments: Payment[] = [];
  private tutorRequests: TutorRequest[] = [];
  private messages: Message[] = [];
  private progressReports: ProgressReport[] = [];
  private clarifications: Clarification[] = [];
  private parentalControls: ParentalControl[] = [];
  private tutorRatings: TutorRating[] = [];
  private earningsRecords: Earnings[] = [];
  private studentInvites: StudentInvite[] = [];
  
  private nextId = {
    user: 1,
    student: 1,
    assignment: 1,
    studentAssignment: 1,
    material: 1,
    schedule: 1,
    session: 1,
    feedback: 1,
    attendance: 1,
    payment: 1,
    tutorRequest: 1,
    message: 1,
    progressReport: 1,
    clarification: 1,
    parentalControl: 1,
    tutorRating: 1,
    earnings: 1,
    studentInvite: 1,
  };

  // User operations
  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = { ...user, id: this.nextId.user++, role: user.role || null };
    this.users.push(newUser);
    return newUser;
  }

  async getUserById(id: number): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.users.find(u => u.email === email) || null;
  }

  async updateUser(id: number, user: Partial<User>): Promise<User> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) throw new Error("User not found");
    this.users[index] = { ...this.users[index], ...user };
    return this.users[index];
  }

  // Student operations
  async createStudent(student: InsertStudent): Promise<Student> {
    const newStudent: Student = { ...student, id: this.nextId.student++ };
    this.students.push(newStudent);
    return newStudent;
  }

  async getStudentById(id: number): Promise<Student | null> {
    return this.students.find(s => s.id === id) || null;
  }

  async getStudentByUserId(userId: number): Promise<Student | null> {
    return this.students.find(s => s.userId === userId) || null;
  }

  async getStudentsByParent(parentId: number): Promise<Student[]> {
    return this.students.filter(s => s.parentId === parentId);
  }

  async getStudentsByTeacher(teacherId: number): Promise<Student[]> {
    const approvedRequests = this.tutorRequests.filter(
      r => r.teacherId === teacherId && r.status === "approved"
    );
    const studentIds = approvedRequests.map(r => r.studentId).filter(id => id !== null) as number[];
    return this.students.filter(s => studentIds.includes(s.id));
  }

  async updateStudent(id: number, student: Partial<Student>): Promise<Student> {
    const index = this.students.findIndex(s => s.id === id);
    if (index === -1) throw new Error("Student not found");
    this.students[index] = { ...this.students[index], ...student };
    return this.students[index];
  }

  // Assignment operations
  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const newAssignment: Assignment = { ...assignment, id: this.nextId.assignment++ };
    this.assignments.push(newAssignment);
    return newAssignment;
  }

  async getAssignmentById(id: number): Promise<Assignment | null> {
    return this.assignments.find(a => a.id === id) || null;
  }

  async getAssignmentsByTeacher(teacherId: number): Promise<Assignment[]> {
    return this.assignments.filter(a => a.teacherId === teacherId);
  }

  async getAssignmentsByGradeLevel(gradeLevel: string): Promise<Assignment[]> {
    return this.assignments.filter(a => a.gradeLevel === gradeLevel);
  }

  async updateAssignment(id: number, assignment: Partial<Assignment>): Promise<Assignment> {
    const index = this.assignments.findIndex(a => a.id === id);
    if (index === -1) throw new Error("Assignment not found");
    this.assignments[index] = { ...this.assignments[index], ...assignment };
    return this.assignments[index];
  }

  async deleteAssignment(id: number): Promise<void> {
    this.assignments = this.assignments.filter(a => a.id !== id);
  }

  // Student Assignment operations
  async createStudentAssignment(studentAssignment: InsertStudentAssignment): Promise<StudentAssignment> {
    const newSA: StudentAssignment = { ...studentAssignment, id: this.nextId.studentAssignment++ };
    this.studentAssignments.push(newSA);
    return newSA;
  }

  async getStudentAssignmentById(id: number): Promise<StudentAssignment | null> {
    return this.studentAssignments.find(sa => sa.id === id) || null;
  }

  async getStudentAssignmentsByStudent(studentId: number): Promise<StudentAssignment[]> {
    return this.studentAssignments.filter(sa => sa.studentId === studentId);
  }

  async getStudentAssignmentsByAssignment(assignmentId: number): Promise<StudentAssignment[]> {
    return this.studentAssignments.filter(sa => sa.assignmentId === assignmentId);
  }

  async updateStudentAssignment(id: number, studentAssignment: Partial<StudentAssignment>): Promise<StudentAssignment> {
    const index = this.studentAssignments.findIndex(sa => sa.id === id);
    if (index === -1) throw new Error("Student assignment not found");
    this.studentAssignments[index] = { ...this.studentAssignments[index], ...studentAssignment };
    return this.studentAssignments[index];
  }

  // Material operations
  async createMaterial(material: InsertMaterial): Promise<Material> {
    const newMaterial: Material = { ...material, id: this.nextId.material++ };
    this.materials.push(newMaterial);
    return newMaterial;
  }

  async getMaterialById(id: number): Promise<Material | null> {
    return this.materials.find(m => m.id === id) || null;
  }

  async getMaterialsByTeacher(teacherId: number): Promise<Material[]> {
    return this.materials.filter(m => m.teacherId === teacherId);
  }

  async getMaterialsBySubject(subject: string): Promise<Material[]> {
    return this.materials.filter(m => m.subject === subject);
  }

  async getMaterialsByGradeLevel(gradeLevel: string): Promise<Material[]> {
    return this.materials.filter(m => m.gradeLevel === gradeLevel);
  }

  async deleteMaterial(id: number): Promise<void> {
    this.materials = this.materials.filter(m => m.id !== id);
  }

  // Schedule operations
  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const newSchedule: Schedule = { ...schedule, id: this.nextId.schedule++ };
    this.schedules.push(newSchedule);
    return newSchedule;
  }

  async getSchedulesByTeacher(teacherId: number): Promise<Schedule[]> {
    return this.schedules.filter(s => s.teacherId === teacherId);
  }

  async getSchedulesByStudent(studentId: number): Promise<Schedule[]> {
    return this.schedules.filter(s => s.studentId === studentId);
  }

  async updateSchedule(id: number, schedule: Partial<Schedule>): Promise<Schedule> {
    const index = this.schedules.findIndex(s => s.id === id);
    if (index === -1) throw new Error("Schedule not found");
    this.schedules[index] = { ...this.schedules[index], ...schedule };
    return this.schedules[index];
  }

  async deleteSchedule(id: number): Promise<void> {
    this.schedules = this.schedules.filter(s => s.id !== id);
  }

  // Session operations
  async createSession(session: InsertSession): Promise<Session> {
    const newSession: Session = { ...session, id: this.nextId.session++ };
    this.sessions.push(newSession);
    return newSession;
  }

  async getSessionById(id: number): Promise<Session | null> {
    return this.sessions.find(s => s.id === id) || null;
  }

  async getSessionsByTeacher(teacherId: number): Promise<Session[]> {
    return this.sessions.filter(s => s.teacherId === teacherId);
  }

  async getSessionsByStudent(studentId: number): Promise<Session[]> {
    return this.sessions.filter(s => s.studentIds.includes(studentId));
  }

  async updateSession(id: number, session: Partial<Session>): Promise<Session> {
    const index = this.sessions.findIndex(s => s.id === id);
    if (index === -1) throw new Error("Session not found");
    this.sessions[index] = { ...this.sessions[index], ...session };
    return this.sessions[index];
  }

  // Feedback operations
  async createFeedback(feedback: InsertFeedback): Promise<Feedback> {
    const newFeedback: Feedback = { ...feedback, id: this.nextId.feedback++ };
    this.feedbacks.push(newFeedback);
    return newFeedback;
  }

  async getFeedbackByStudent(studentId: number): Promise<Feedback[]> {
    return this.feedbacks.filter(f => f.studentId === studentId);
  }

  async getFeedbackByTeacher(teacherId: number): Promise<Feedback[]> {
    return this.feedbacks.filter(f => f.teacherId === teacherId);
  }

  // Attendance operations
  async createAttendance(attendance: InsertAttendance): Promise<Attendance> {
    const newAttendance: Attendance = { ...attendance, id: this.nextId.attendance++ };
    this.attendances.push(newAttendance);
    return newAttendance;
  }

  async getAttendanceByStudent(studentId: number): Promise<Attendance[]> {
    return this.attendances.filter(a => a.studentId === studentId);
  }

  async getAttendanceBySession(sessionId: number): Promise<Attendance[]> {
    return this.attendances.filter(a => a.sessionId === sessionId);
  }

  async updateAttendance(id: number, attendance: Partial<Attendance>): Promise<Attendance> {
    const index = this.attendances.findIndex(a => a.id === id);
    if (index === -1) throw new Error("Attendance not found");
    this.attendances[index] = { ...this.attendances[index], ...attendance };
    return this.attendances[index];
  }

  // Payment operations
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const newPayment: Payment = { ...payment, id: this.nextId.payment++ };
    this.payments.push(newPayment);
    return newPayment;
  }

  async getPaymentsByParent(parentId: number): Promise<Payment[]> {
    return this.payments.filter(p => p.parentId === parentId);
  }

  async getPaymentsByTeacher(teacherId: number): Promise<Payment[]> {
    return this.payments.filter(p => p.teacherId === teacherId);
  }

  async updatePayment(id: number, payment: Partial<Payment>): Promise<Payment> {
    const index = this.payments.findIndex(p => p.id === id);
    if (index === -1) throw new Error("Payment not found");
    this.payments[index] = { ...this.payments[index], ...payment };
    return this.payments[index];
  }

  // Tutor Request operations
  async createTutorRequest(request: InsertTutorRequest): Promise<TutorRequest> {
    const newRequest: TutorRequest = { ...request, id: this.nextId.tutorRequest++ };
    this.tutorRequests.push(newRequest);
    return newRequest;
  }

  async getTutorRequestById(id: number): Promise<TutorRequest | null> {
    return this.tutorRequests.find(r => r.id === id) || null;
  }

  async getTutorRequestsByParent(parentId: number): Promise<TutorRequest[]> {
    return this.tutorRequests.filter(r => r.parentId === parentId);
  }

  async getTutorRequestsByTeacher(teacherId: number): Promise<TutorRequest[]> {
    return this.tutorRequests.filter(r => r.teacherId === teacherId);
  }

  async updateTutorRequest(id: number, request: Partial<TutorRequest>): Promise<TutorRequest> {
    const index = this.tutorRequests.findIndex(r => r.id === id);
    if (index === -1) throw new Error("Tutor request not found");
    this.tutorRequests[index] = { ...this.tutorRequests[index], ...request };
    return this.tutorRequests[index];
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const newMessage: Message = { ...message, id: this.nextId.message++ };
    this.messages.push(newMessage);
    return newMessage;
  }

  async getMessagesBetweenUsers(user1Id: number, user2Id: number): Promise<Message[]> {
    return this.messages.filter(
      m => (m.senderId === user1Id && m.receiverId === user2Id) ||
           (m.senderId === user2Id && m.receiverId === user1Id)
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async getMessagesByUser(userId: number): Promise<Message[]> {
    return this.messages.filter(m => m.senderId === userId || m.receiverId === userId);
  }

  async markMessageAsRead(id: number): Promise<Message> {
    const index = this.messages.findIndex(m => m.id === id);
    if (index === -1) throw new Error("Message not found");
    this.messages[index].isRead = true;
    return this.messages[index];
  }

  // Progress Report operations
  async createProgressReport(report: InsertProgressReport): Promise<ProgressReport> {
    const newReport: ProgressReport = { ...report, id: this.nextId.progressReport++ };
    this.progressReports.push(newReport);
    return newReport;
  }

  async getProgressReportsByStudent(studentId: number): Promise<ProgressReport[]> {
    return this.progressReports.filter(r => r.studentId === studentId);
  }

  async getProgressReportsByTeacher(teacherId: number): Promise<ProgressReport[]> {
    return this.progressReports.filter(r => r.teacherId === teacherId);
  }

  // Clarification operations
  async createClarification(clarification: InsertClarification): Promise<Clarification> {
    const newClarification: Clarification = { ...clarification, id: this.nextId.clarification++ };
    this.clarifications.push(newClarification);
    return newClarification;
  }

  async getClarificationsByStudent(studentId: number): Promise<Clarification[]> {
    return this.clarifications.filter(c => c.studentId === studentId);
  }

  async getClarificationsByAssignment(assignmentId: number): Promise<Clarification[]> {
    return this.clarifications.filter(c => c.assignmentId === assignmentId);
  }

  async updateClarification(id: number, clarification: Partial<Clarification>): Promise<Clarification> {
    const index = this.clarifications.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Clarification not found");
    this.clarifications[index] = { ...this.clarifications[index], ...clarification };
    return this.clarifications[index];
  }

  // Parental Control operations
  async createParentalControl(control: InsertParentalControl): Promise<ParentalControl> {
    const newControl: ParentalControl = { ...control, id: this.nextId.parentalControl++ };
    this.parentalControls.push(newControl);
    return newControl;
  }

  async getParentalControlByStudent(studentId: number): Promise<ParentalControl | null> {
    return this.parentalControls.find(c => c.studentId === studentId) || null;
  }

  async updateParentalControl(id: number, control: Partial<ParentalControl>): Promise<ParentalControl> {
    const index = this.parentalControls.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Parental control not found");
    this.parentalControls[index] = { ...this.parentalControls[index], ...control };
    return this.parentalControls[index];
  }

  // Tutor Rating operations
  async createTutorRating(rating: InsertTutorRating): Promise<TutorRating> {
    const newRating: TutorRating = { ...rating, id: this.nextId.tutorRating++ };
    this.tutorRatings.push(newRating);
    return newRating;
  }

  async getRatingsByTeacher(teacherId: number): Promise<TutorRating[]> {
    return this.tutorRatings.filter(r => r.teacherId === teacherId);
  }

  async getRatingsByParent(parentId: number): Promise<TutorRating[]> {
    return this.tutorRatings.filter(r => r.parentId === parentId);
  }

  // Earnings operations
  async createEarnings(earnings: InsertEarnings): Promise<Earnings> {
    const newEarnings: Earnings = { ...earnings, id: this.nextId.earnings++ };
    this.earningsRecords.push(newEarnings);
    return newEarnings;
  }

  async getEarningsByTeacher(teacherId: number): Promise<Earnings[]> {
    return this.earningsRecords.filter(e => e.teacherId === teacherId);
  }

  // Student Invite operations
  async createStudentInvite(invite: InsertStudentInvite): Promise<StudentInvite> {
    const newInvite: StudentInvite = { ...invite, id: this.nextId.studentInvite++ };
    this.studentInvites.push(newInvite);
    return newInvite;
  }

  async getStudentInviteByToken(token: string): Promise<StudentInvite | null> {
    return this.studentInvites.find(i => i.token === token) || null;
  }

  async getStudentInvitesByParent(parentId: number): Promise<StudentInvite[]> {
    return this.studentInvites.filter(i => i.parentId === parentId);
  }

  async updateStudentInvite(id: number, invite: Partial<StudentInvite>): Promise<StudentInvite> {
    const index = this.studentInvites.findIndex(i => i.id === id);
    if (index === -1) throw new Error("Student invite not found");
    this.studentInvites[index] = { ...this.studentInvites[index], ...invite };
    return this.studentInvites[index];
  }
}

export const storage = new MemStorage();
