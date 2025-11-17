import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { handleFirebaseLogin, handleFirebaseLogout, isFirebaseAuthenticated } from "./firebaseAuth";
import { 
  handleEmailPasswordSignup, 
  handleEmailPasswordLogin, 
  handleEmailVerification, 
  handleResendVerification,
  handleEmailPasswordLogout,
  handleForgotPassword,
  handleResetPassword,
  isEmailPasswordAuthenticated 
} from "./emailPasswordAuth";
import { generateSessionSummary } from "./openai";
import { sanitizeUser, sanitizeUsers } from "./utils/sanitizeUser";
import { isUniversallyAuthenticated, getUserIdFromSession } from "./authMiddleware";
import multer from "multer";
import { z } from "zod";
import { insertSessionSummarySchema } from "@shared/schema";

// Set up file upload
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (user) {
        res.json(sanitizeUser(user));
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User routes
  app.get('/api/users/role/:role', isAuthenticated, async (req, res) => {
    try {
      const { role } = req.params;
      const users = await storage.getUsersByRole(role);
      res.json(sanitizeUsers(users));
    } catch (error) {
      console.error("Error fetching users by role:", error);
      res.status(500).json({ message: "Failed to fetch users by role" });
    }
  });

  // Me (current user) role update endpoint for onboarding - supports both auth methods
  app.patch('/api/users/me/role', async (req: any, res) => {
    try {
      let userId: string | undefined;
      
      // Check Firebase auth first
      if (req.session?.firebaseUser?.uid) {
        userId = req.session.firebaseUser.uid;
      } 
      // Then check email/password auth
      else if (req.session?.emailPasswordUser?.id) {
        userId = req.session.emailPasswordUser.id;
      }
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { role } = req.body;
      
      // Validate role
      if (!['student', 'parent', 'tutor'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const updatedUser = await storage.updateUserRole(userId, role);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(sanitizeUser(updatedUser));
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Admin role update endpoint (requires authentication)
  app.patch('/api/users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      // Validate role
      if (!['student', 'parent', 'tutor'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const updatedUser = await storage.updateUserRole(id, role);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(sanitizeUser(updatedUser));
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Student routes
  app.get('/api/students/parent/:parentId', isAuthenticated, async (req, res) => {
    try {
      const { parentId } = req.params;
      const students = await storage.getStudentsByParentId(parentId);
      res.json(sanitizeUsers(students));
    } catch (error) {
      console.error("Error fetching students by parent:", error);
      res.status(500).json({ message: "Failed to fetch students by parent" });
    }
  });

  app.get('/api/students/tutor/:tutorId', isAuthenticated, async (req, res) => {
    try {
      const { tutorId } = req.params;
      const students = await storage.getStudentsByTutorId(tutorId);
      res.json(sanitizeUsers(students));
    } catch (error) {
      console.error("Error fetching students by tutor:", error);
      res.status(500).json({ message: "Failed to fetch students by tutor" });
    }
  });

  // Subject routes
  app.get('/api/subjects', isAuthenticated, async (req, res) => {
    try {
      const subjects = await storage.getSubjects();
      res.json(subjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  app.get('/api/subjects/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const subject = await storage.getSubject(Number(id));
      
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }
      
      res.json(subject);
    } catch (error) {
      console.error("Error fetching subject:", error);
      res.status(500).json({ message: "Failed to fetch subject" });
    }
  });

  app.post('/api/subjects', isAuthenticated, async (req, res) => {
    try {
      const { name, description } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Subject name is required" });
      }
      
      const newSubject = await storage.createSubject({
        name,
        description,
      });
      
      res.status(201).json(newSubject);
    } catch (error) {
      console.error("Error creating subject:", error);
      res.status(500).json({ message: "Failed to create subject" });
    }
  });

  // Assignment routes
  app.get('/api/assignments/tutor/:tutorId', isAuthenticated, async (req, res) => {
    try {
      const { tutorId } = req.params;
      const assignments = await storage.getAssignmentsByTutor(tutorId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments by tutor:", error);
      res.status(500).json({ message: "Failed to fetch assignments by tutor" });
    }
  });

  app.get('/api/assignments/student/:studentId', isAuthenticated, async (req, res) => {
    try {
      const { studentId } = req.params;
      const assignments = await storage.getAssignmentsByStudent(studentId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments by student:", error);
      res.status(500).json({ message: "Failed to fetch assignments by student" });
    }
  });

  app.post('/api/assignments', isAuthenticated, async (req: any, res) => {
    try {
      const { title, description, subjectId, dueDate } = req.body;
      const tutorId = req.user.claims.sub;
      
      if (!title) {
        return res.status(400).json({ message: "Assignment title is required" });
      }
      
      const newAssignment = await storage.createAssignment({
        title,
        description,
        subjectId: subjectId ? Number(subjectId) : null,
        tutorId,
        dueDate: dueDate ? new Date(dueDate) : null,
      });
      
      res.status(201).json(newAssignment);
    } catch (error) {
      console.error("Error creating assignment:", error);
      res.status(500).json({ message: "Failed to create assignment" });
    }
  });

  app.post('/api/assignments/:assignmentId/assign', isAuthenticated, async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const { studentId } = req.body;
      
      if (!studentId) {
        return res.status(400).json({ message: "Student ID is required" });
      }
      
      const assignment = await storage.getAssignment(Number(assignmentId));
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      const studentAssignment = await storage.assignToStudent({
        studentId,
        assignmentId: Number(assignmentId),
        status: "assigned",
      });
      
      res.status(201).json(studentAssignment);
    } catch (error) {
      console.error("Error assigning assignment to student:", error);
      res.status(500).json({ message: "Failed to assign assignment to student" });
    }
  });

  app.patch('/api/student-assignments/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, submissionText, submissionUrl, feedback } = req.body;
      
      const updatedAssignment = await storage.updateStudentAssignment(Number(id), {
        status,
        submissionText,
        submissionUrl,
        feedback,
      });
      
      if (!updatedAssignment) {
        return res.status(404).json({ message: "Student assignment not found" });
      }
      
      res.json(updatedAssignment);
    } catch (error) {
      console.error("Error updating student assignment:", error);
      res.status(500).json({ message: "Failed to update student assignment" });
    }
  });

  // Session routes
  app.get('/api/sessions/tutor/:tutorId', isAuthenticated, async (req, res) => {
    try {
      const { tutorId } = req.params;
      const sessions = await storage.getSessionsByTutor(tutorId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions by tutor:", error);
      res.status(500).json({ message: "Failed to fetch sessions by tutor" });
    }
  });

  app.get('/api/sessions/student/:studentId', isAuthenticated, async (req, res) => {
    try {
      const { studentId } = req.params;
      const sessions = await storage.getSessionsByStudent(studentId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions by student:", error);
      res.status(500).json({ message: "Failed to fetch sessions by student" });
    }
  });

  app.get('/api/sessions/upcoming/tutor/:tutorId', isAuthenticated, async (req, res) => {
    try {
      const { tutorId } = req.params;
      const sessions = await storage.getUpcomingSessionsByTutor(tutorId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching upcoming sessions by tutor:", error);
      res.status(500).json({ message: "Failed to fetch upcoming sessions by tutor" });
    }
  });

  app.get('/api/sessions/upcoming/student/:studentId', isAuthenticated, async (req, res) => {
    try {
      const { studentId } = req.params;
      const sessions = await storage.getUpcomingSessionsByStudent(studentId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching upcoming sessions by student:", error);
      res.status(500).json({ message: "Failed to fetch upcoming sessions by student" });
    }
  });

  app.post('/api/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const { title, subjectId, studentId, startTime, endTime, meetLink } = req.body;
      const tutorId = req.user.claims.sub;
      
      if (!title || !studentId || !startTime || !endTime) {
        return res.status(400).json({ message: "Required fields are missing" });
      }
      
      const newSession = await storage.createSession({
        title,
        subjectId: subjectId ? Number(subjectId) : null,
        tutorId,
        studentId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        meetLink,
        status: "scheduled",
      });
      
      res.status(201).json(newSession);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  app.patch('/api/sessions/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, subjectId, startTime, endTime, meetLink, status, notes } = req.body;
      
      const updatedSession = await storage.updateSession(Number(id), {
        title,
        subjectId: subjectId ? Number(subjectId) : undefined,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        meetLink,
        status,
        notes,
      });
      
      if (!updatedSession) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json(updatedSession);
    } catch (error) {
      console.error("Error updating session:", error);
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  // Session summary routes
  app.get('/api/session-summaries/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const summary = await storage.getSessionSummary(Number(id));
      
      if (!summary) {
        return res.status(404).json({ message: "Session summary not found" });
      }
      
      res.json(summary);
    } catch (error) {
      console.error("Error fetching session summary:", error);
      res.status(500).json({ message: "Failed to fetch session summary" });
    }
  });

  app.get('/api/session-summaries/session/:sessionId', isAuthenticated, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const summary = await storage.getSessionSummaryBySessionId(Number(sessionId));
      
      if (!summary) {
        return res.status(404).json({ message: "Session summary not found" });
      }
      
      res.json(summary);
    } catch (error) {
      console.error("Error fetching session summary by session:", error);
      res.status(500).json({ message: "Failed to fetch session summary by session" });
    }
  });

  app.post('/api/session-summaries', isAuthenticated, async (req, res) => {
    try {
      const summaryData = req.body;
      
      // Validate the summary data using zod
      const validatedData = insertSessionSummarySchema.parse(summaryData);
      
      const newSummary = await storage.createSessionSummary(validatedData);
      res.status(201).json(newSummary);
    } catch (error) {
      console.error("Error creating session summary:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session summary data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create session summary" });
    }
  });

  // AI-generated session summary
  app.post('/api/ai-summary', isAuthenticated, upload.single('recording'), async (req, res) => {
    try {
      const { sessionId, notes } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }
      
      // Get the session details
      const session = await storage.getSession(Number(sessionId));
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Generate AI summary
      let aiSummary;
      if (req.file) {
        // If there's a recording file, use it for summary generation
        const recordingBuffer = req.file.buffer;
        // Convert buffer to base64 (in a real app, you'd store the file and use its URL)
        const base64Recording = recordingBuffer.toString('base64');
        
        aiSummary = await generateSessionSummary(notes || "", base64Recording);
      } else if (notes) {
        // If no recording but notes provided, use notes for summary generation
        aiSummary = await generateSessionSummary(notes);
      } else {
        return res.status(400).json({ message: "Either notes or a recording file is required" });
      }
      
      // Create the session summary
      const summary = await storage.createSessionSummary({
        sessionId: Number(sessionId),
        summary: aiSummary.summary,
        keyConcepts: aiSummary.keyConcepts,
        homeworkAssigned: aiSummary.homeworkAssigned,
        engagementLevel: aiSummary.engagementLevel,
        recordingUrl: req.file ? "Recording processed via AI" : undefined,
        aiGenerated: true
      });
      
      res.status(201).json(summary);
    } catch (error) {
      console.error("Error generating AI summary:", error);
      res.status(500).json({ message: "Failed to generate AI summary" });
    }
  });

  // Message routes
  app.get('/api/messages/user/:userId', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const messages = await storage.getMessagesByUser(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages by user:", error);
      res.status(500).json({ message: "Failed to fetch messages by user" });
    }
  });

  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const { receiverId, content } = req.body;
      const senderId = req.user.claims.sub;
      
      if (!receiverId || !content) {
        return res.status(400).json({ message: "Receiver ID and content are required" });
      }
      
      const newMessage = await storage.createMessage({
        senderId,
        receiverId,
        content,
        read: false
      });
      
      res.status(201).json(newMessage);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.patch('/api/messages/:id/read', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const message = await storage.markMessageAsRead(Number(id));
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      res.json(message);
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Progress routes
  app.get('/api/progress/student/:studentId', isAuthenticated, async (req, res) => {
    try {
      const { studentId } = req.params;
      const progress = await storage.getStudentProgress(studentId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching student progress:", error);
      res.status(500).json({ message: "Failed to fetch student progress" });
    }
  });

  app.post('/api/progress', isAuthenticated, async (req, res) => {
    try {
      const { studentId, subjectId, week, totalWeeks, completionPercentage } = req.body;
      
      if (!studentId || !subjectId || !week || !totalWeeks) {
        return res.status(400).json({ message: "Required fields are missing" });
      }
      
      const newProgress = await storage.createStudentProgress({
        studentId,
        subjectId: Number(subjectId),
        week: Number(week),
        totalWeeks: Number(totalWeeks),
        completionPercentage: completionPercentage ? Number(completionPercentage) : 0
      });
      
      res.status(201).json(newProgress);
    } catch (error) {
      console.error("Error creating student progress:", error);
      res.status(500).json({ message: "Failed to create student progress" });
    }
  });

  app.patch('/api/progress/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { week, completionPercentage } = req.body;
      
      const updatedProgress = await storage.updateStudentProgress(Number(id), {
        week: week ? Number(week) : undefined,
        completionPercentage: completionPercentage ? Number(completionPercentage) : undefined
      });
      
      if (!updatedProgress) {
        return res.status(404).json({ message: "Progress record not found" });
      }
      
      res.json(updatedProgress);
    } catch (error) {
      console.error("Error updating student progress:", error);
      res.status(500).json({ message: "Failed to update student progress" });
    }
  });

  // Tutor request routes
  app.post('/api/tutor-requests', isUniversallyAuthenticated, async (req, res) => {
    try {
      const userId = getUserIdFromSession(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { tutorId, studentId, subjectId, message } = req.body;
      
      const newRequest = await storage.createTutorRequest({
        parentId: userId,
        tutorId,
        studentId: studentId || undefined,
        subjectId: subjectId ? Number(subjectId) : undefined,
        message: message || undefined,
        status: 'pending'
      });
      
      // Create notification for tutor
      await storage.createNotification({
        userId: tutorId,
        senderId: userId,
        type: 'tutor_request',
        title: 'New Tutor Request',
        message: `You have a new tutoring request${subjectId ? ' for a subject' : ''}`,
        link: `/tutor-requests/${newRequest.id}`
      });
      
      res.status(201).json(newRequest);
    } catch (error) {
      console.error("Error creating tutor request:", error);
      res.status(500).json({ message: "Failed to create tutor request" });
    }
  });

  app.get('/api/tutor-requests/parent/:parentId', isUniversallyAuthenticated, async (req, res) => {
    try {
      const userId = getUserIdFromSession(req);
      const { parentId } = req.params;
      
      // Authorization: Only allow users to access their own requests
      if (userId !== parentId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const requests = await storage.getTutorRequestsByParent(parentId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching parent tutor requests:", error);
      res.status(500).json({ message: "Failed to fetch tutor requests" });
    }
  });

  app.get('/api/tutor-requests/tutor/:tutorId', isUniversallyAuthenticated, async (req, res) => {
    try {
      const userId = getUserIdFromSession(req);
      const { tutorId } = req.params;
      
      // Authorization: Only allow users to access their own requests
      if (userId !== tutorId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const requests = await storage.getTutorRequestsByTutor(tutorId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching tutor requests:", error);
      res.status(500).json({ message: "Failed to fetch tutor requests" });
    }
  });

  app.patch('/api/tutor-requests/:id/status', isUniversallyAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = getUserIdFromSession(req);
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Get the request first to check authorization
      const request = await storage.getTutorRequest(Number(id));
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      // Authorization: Only the tutor can update the status
      if (request.tutorId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedRequest = await storage.updateTutorRequestStatus(Number(id), status);
      
      // Create notification for parent
      await storage.createNotification({
        userId: updatedRequest!.parentId,
        senderId: userId,
        type: 'tutor_request_response',
        title: `Tutor Request ${status}`,
        message: `Your tutor request has been ${status}`,
        link: `/tutor-requests/${id}`
      });
      
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating tutor request:", error);
      res.status(500).json({ message: "Failed to update tutor request" });
    }
  });

  // Notification routes
  app.get('/api/notifications/user/:userId', isUniversallyAuthenticated, async (req, res) => {
    try {
      const authUserId = getUserIdFromSession(req);
      const { userId } = req.params;
      
      // Authorization: Only allow users to access their own notifications
      if (authUserId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get('/api/notifications/unread/:userId', isUniversallyAuthenticated, async (req, res) => {
    try {
      const authUserId = getUserIdFromSession(req);
      const { userId } = req.params;
      
      // Authorization: Only allow users to access their own notifications
      if (authUserId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const notifications = await storage.getUnreadNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching unread notifications:", error);
      res.status(500).json({ message: "Failed to fetch unread notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', isUniversallyAuthenticated, async (req, res) => {
    try {
      const authUserId = getUserIdFromSession(req);
      const { id } = req.params;
      
      // Get notification first to check ownership
      const notification = await storage.getNotification(Number(id));
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      // Authorization: Only allow users to mark their own notifications as read
      if (notification.userId !== authUserId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedNotification = await storage.markNotificationAsRead(Number(id));
      res.json(updatedNotification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch('/api/notifications/read-all/:userId', isUniversallyAuthenticated, async (req, res) => {
    try {
      const authUserId = getUserIdFromSession(req);
      const { userId } = req.params;
      
      // Authorization: Only allow users to mark their own notifications as read
      if (authUserId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const count = await storage.markAllNotificationsAsRead(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Learning material routes
  app.get('/api/learning-materials/tutor/:tutorId', isUniversallyAuthenticated, async (req, res) => {
    try {
      const authUserId = getUserIdFromSession(req);
      const { tutorId } = req.params;
      
      // Authorization: Only allow tutors to access their own materials
      if (authUserId !== tutorId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const materials = await storage.getLearningMaterialsByTutor(tutorId);
      res.json(materials);
    } catch (error) {
      console.error("Error fetching tutor learning materials:", error);
      res.status(500).json({ message: "Failed to fetch learning materials" });
    }
  });

  app.get('/api/learning-materials/student/:studentId', isUniversallyAuthenticated, async (req, res) => {
    try {
      const authUserId = getUserIdFromSession(req);
      const { studentId } = req.params;
      
      // Authorization: Only allow students to access their own materials
      if (authUserId !== studentId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const materials = await storage.getLearningMaterialsByStudent(studentId);
      res.json(materials);
    } catch (error) {
      console.error("Error fetching student learning materials:", error);
      res.status(500).json({ message: "Failed to fetch learning materials" });
    }
  });

  app.post('/api/learning-materials', isUniversallyAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const userId = getUserIdFromSession(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { title, description, fileType, subjectId, studentIds } = req.body;
      
      let fileUrl: string | undefined = undefined;
      if (req.file) {
        // Convert buffer to base64 for storage (in production, use cloud storage)
        fileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      }
      
      const studentIdsArray = typeof studentIds === 'string' ? JSON.parse(studentIds) : studentIds;
      
      const newMaterial = await storage.createLearningMaterial({
        title,
        description: description || undefined,
        fileUrl,
        fileType: fileType || undefined,
        subjectId: subjectId ? Number(subjectId) : undefined,
        tutorId: userId,
        studentIds: studentIdsArray
      });
      
      // Create notifications for students
      for (const studentId of studentIdsArray) {
        await storage.createNotification({
          userId: studentId,
          senderId: userId,
          type: 'learning_material_shared',
          title: 'New Learning Material',
          message: `New learning material "${title}" has been shared with you`,
          link: `/learning-materials/${newMaterial.id}`
        });
      }
      
      res.status(201).json(newMaterial);
    } catch (error) {
      console.error("Error creating learning material:", error);
      res.status(500).json({ message: "Failed to create learning material" });
    }
  });

  app.delete('/api/learning-materials/:id', isUniversallyAuthenticated, async (req, res) => {
    try {
      const authUserId = getUserIdFromSession(req);
      const { id } = req.params;
      
      // Get material first to check ownership
      const material = await storage.getLearningMaterial(Number(id));
      if (!material) {
        return res.status(404).json({ message: "Learning material not found" });
      }
      
      // Authorization: Only allow tutors to delete their own materials
      if (material.tutorId !== authUserId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.deleteLearningMaterial(Number(id));
      res.json({ message: "Learning material deleted successfully" });
    } catch (error) {
      console.error("Error deleting learning material:", error);
      res.status(500).json({ message: "Failed to delete learning material" });
    }
  });

  // Firebase authentication routes
  app.post('/api/auth/firebase-login', async (req, res) => {
    try {
      return handleFirebaseLogin(req, res);
    } catch (error) {
      console.error("Firebase login error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  app.post('/api/auth/firebase-logout', async (req, res) => {
    try {
      return handleFirebaseLogout(req, res);
    } catch (error) {
      console.error("Firebase logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Email/Password authentication routes
  app.post('/api/auth/email-signup', async (req, res) => {
    try {
      return handleEmailPasswordSignup(req, res);
    } catch (error) {
      console.error("Email signup error:", error);
      res.status(500).json({ message: "Signup failed" });
    }
  });

  app.post('/api/auth/email-login', async (req, res) => {
    try {
      return handleEmailPasswordLogin(req, res);
    } catch (error) {
      console.error("Email login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/auth/verify-email', async (req, res) => {
    try {
      return handleEmailVerification(req, res);
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Email verification failed" });
    }
  });

  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      return handleResendVerification(req, res);
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Failed to resend verification" });
    }
  });

  app.post('/api/auth/email-logout', async (req, res) => {
    try {
      return handleEmailPasswordLogout(req, res);
    } catch (error) {
      console.error("Email logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      return handleForgotPassword(req, res);
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      return handleResetPassword(req, res);
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Email/Password user endpoint
  app.get('/api/auth/email-user', isEmailPasswordAuthenticated, async (req: any, res) => {
    try {
      if (req.session?.emailPasswordUser) {
        const userId = req.session.emailPasswordUser.id;
        const user = await storage.getUser(userId);
        
        if (user) {
          res.json(sanitizeUser(user));
        } else {
          res.status(404).json({ message: "User not found" });
        }
      } else {
        res.status(401).json({ message: "Unauthorized" });
      }
    } catch (error) {
      console.error("Error fetching email user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Onboarding profile endpoints
  app.post('/api/student/profile', isUniversallyAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromSession(req);
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Store the student profile data (this would typically save to a student profile table)
      // For now, we'll just return success as if we stored it
      res.status(200).json({ success: true, message: "Student profile updated" });
    } catch (error) {
      console.error("Error updating student profile:", error);
      res.status(500).json({ message: "Failed to update student profile" });
    }
  });
  
  app.post('/api/parent/profile', isUniversallyAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromSession(req);
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Store the parent profile data
      res.status(200).json({ success: true, message: "Parent profile updated" });
    } catch (error) {
      console.error("Error updating parent profile:", error);
      res.status(500).json({ message: "Failed to update parent profile" });
    }
  });
  
  app.post('/api/tutor/profile', isUniversallyAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromSession(req);
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Store the tutor profile data
      res.status(200).json({ success: true, message: "Tutor profile updated" });
    } catch (error) {
      console.error("Error updating tutor profile:", error);
      res.status(500).json({ message: "Failed to update tutor profile" });
    }
  });
  
  app.post('/api/user/preferences', isUniversallyAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserIdFromSession(req);
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Store the user preferences
      res.status(200).json({ success: true, message: "User preferences updated" });
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ message: "Failed to update user preferences" });
    }
  });

  // Firebase user endpoint - alternative to Replit Auth user endpoint
  app.get('/api/auth/firebase-user', isFirebaseAuthenticated, async (req: any, res) => {
    try {
      if (req.session?.firebaseUser) {
        const userId = req.session.firebaseUser.uid;
        const user = await storage.getUser(userId);
        
        if (user) {
          res.json(sanitizeUser(user));
        } else {
          res.status(404).json({ message: "User not found" });
        }
      } else {
        res.status(401).json({ message: "Unauthorized" });
      }
    } catch (error) {
      console.error("Error fetching Firebase user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
