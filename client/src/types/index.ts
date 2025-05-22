// User types
export interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: 'student' | 'parent' | 'tutor';
  createdAt?: Date;
  updatedAt?: Date;
}

// Subject types
export interface Subject {
  id: number;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Assignment types
export interface Assignment {
  id: number;
  title: string;
  description?: string;
  subjectId?: number;
  tutorId: string;
  dueDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StudentAssignment {
  id: number;
  studentId: string;
  assignmentId: number;
  status: 'assigned' | 'in_progress' | 'completed' | 'overdue';
  submissionText?: string;
  submissionUrl?: string;
  feedback?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Session types
export interface TutoringSession {
  id: number;
  title: string;
  subjectId?: number;
  tutorId: string;
  studentId: string;
  startTime: Date;
  endTime: Date;
  meetLink?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SessionSummary {
  id: number;
  sessionId: number;
  summary: string;
  keyConcepts: string[];
  homeworkAssigned: string;
  engagementLevel: number;
  recordingUrl?: string;
  aiGenerated: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Message types
export interface Message {
  id: number;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Progress types
export interface StudentProgress {
  id: number;
  studentId: string;
  subjectId: number;
  week: number;
  totalWeeks: number;
  completionPercentage: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Extended types with relations
export interface AssignmentWithRelations extends Assignment {
  subject?: Subject;
  tutor?: User;
}

export interface StudentAssignmentWithRelations extends StudentAssignment {
  assignment?: AssignmentWithRelations;
  student?: User;
}

export interface SessionWithRelations extends TutoringSession {
  subject?: Subject;
  tutor?: User;
  student?: User;
  summary?: SessionSummary;
}

export interface MessageWithRelations extends Message {
  sender?: User;
  receiver?: User;
}

export interface StudentProgressWithRelations extends StudentProgress {
  student?: User;
  subject?: Subject;
}
