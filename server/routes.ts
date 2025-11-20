import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertStudentSchema,
  insertAssignmentSchema,
  insertStudentAssignmentSchema,
  insertMaterialSchema,
  updateMaterialSchema,
  insertScheduleSchema,
  insertSessionSchema,
  insertFeedbackSchema,
  insertAttendanceSchema,
  insertPaymentSchema,
  insertTutorRequestSchema,
  insertMessageSchema,
  insertProgressReportSchema,
  insertClarificationSchema,
  insertParentalControlSchema,
  insertTutorRatingSchema,
  insertEarningsSchema,
  insertStudentInviteSchema,
  signupSchema,
  loginSchema,
  resendVerificationSchema,
  studentSignupSchema,
} from "@shared/schema";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "./utils/emailService";
import { OAuth2Client } from "google-auth-library";
import { memoryUpload } from "./utils/multer";
import { uploadBufferToCloudinary } from "./utils/cloudinary";

// Simple session management
const sessions = new Map<string, number>();

// Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Auth middleware
function requireAuth(req: Request, res: Response, next: Function) {
  const sessionId = req.headers.authorization?.replace("Bearer ", "");
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.session = { userId: sessions.get(sessionId)! };
  next();
}

// Hash password with bcrypt
async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// Verify password with bcrypt
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function registerRoutes(app: Express) {
  
  // ========== AUTH ROUTES ==========
  
  // Teacher/Parent signup
  app.post("/api/auth/signup", async (req, res) => {
    try {
      // Validate input with Zod
      const validation = signupSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: validation.error.errors[0].message 
        });
      }

      const { email, password, name, role } = validation.data;

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await hashPassword(password);
      
      // Generate email verification token
      const emailVerifyToken = crypto.randomUUID();
      const emailVerifyExpires = new Date();
      emailVerifyExpires.setHours(emailVerifyExpires.getHours() + 24); // 24 hours expiry

      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        role,
        isEmailVerified: false,
        emailVerifyToken,
        emailVerifyExpires: emailVerifyExpires.toISOString(),
        googleId: null,
        profilePicture: null,
      });

      // Send verification email (non-blocking)
      sendVerificationEmail(email, emailVerifyToken, name).catch(err => 
        console.error("Failed to send verification email:", err)
      );

      // Do NOT create session until email is verified
      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          role: user.role,
          isEmailVerified: user.isEmailVerified 
        },
        message: "Signup successful! Please check your email to verify your account before logging in."
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      // Validate input with Zod
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: validation.error.errors[0].message 
        });
      }

      const { email, password } = validation.data;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check if user password exists (for non-Google OAuth users)
      if (!user.password) {
        return res.status(401).json({ error: "Invalid credentials. Please use Google Sign In." });
      }

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        return res.status(403).json({ 
          error: "Please verify your email before logging in",
          needsVerification: true 
        });
      }

      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, user.id);

      res.json({ 
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        sessionId 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Student signup via invite
  app.post("/api/auth/signup/student", async (req, res) => {
    try {
      // Validate input with Zod
      const validation = studentSignupSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: validation.error.errors[0].message 
        });
      }

      const { token, password } = validation.data;
      
      const invite = await storage.getStudentInviteByToken(token);
      if (!invite || invite.status === "accepted") {
        return res.status(400).json({ error: "Invalid or expired invite" });
      }

      // Check if invite is expired
      if (new Date(invite.expiresDate) < new Date()) {
        return res.status(400).json({ error: "Invite has expired" });
      }

      // Create user account with email verification requirement
      const hashedPassword = await hashPassword(password);
      
      // Generate email verification token for student
      const emailVerifyToken = crypto.randomUUID();
      const emailVerifyExpires = new Date();
      emailVerifyExpires.setHours(emailVerifyExpires.getHours() + 24);
      
      const user = await storage.createUser({
        email: invite.email,
        password: hashedPassword,
        name: invite.studentName,
        role: "student",
        isEmailVerified: false, // Students must verify email too
        emailVerifyToken,
        emailVerifyExpires: emailVerifyExpires.toISOString(),
        googleId: null,
        profilePicture: null,
      });

      // Create student profile
      const student = await storage.createStudent({
        userId: user.id,
        parentId: invite.parentId,
        name: invite.studentName,
        gradeLevel: invite.gradeLevel,
        badges: [],
        points: 0,
      });

      // Mark invite as accepted
      await storage.updateStudentInvite(invite.id, { status: "accepted" });

      // Send verification email to student (non-blocking)
      sendVerificationEmail(user.email, emailVerifyToken, user.name).catch(err => 
        console.error("Failed to send verification email to student:", err)
      );

      // Do NOT create session until email is verified
      res.json({ 
        user: { id: user.id, email: user.email, name: user.name, role: user.role, isEmailVerified: user.isEmailVerified },
        student,
        message: "Account created! Please check your email to verify your account before logging in."
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Google Sign In/Sign Up
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { credential, role } = req.body;
      
      if (!credential) {
        return res.status(400).json({ error: "Google credential is required" });
      }

      // Only allow teacher/parent roles for new signups
      if (role && !["teacher", "parent"].includes(role)) {
        return res.status(400).json({ error: "Invalid role for Google sign up" });
      }

      // Verify Google token
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return res.status(401).json({ error: "Invalid Google token" });
      }

      const googleId = payload.sub;
      const email = payload.email;
      const name: string = payload.name || email || "Google User";
      const profilePicture = payload.picture;

      // Check if user exists by Google ID
      let user = await storage.getUserByGoogleId(googleId);

      if (!user && email) {
        // Check if user exists by email (account linking)
        user = await storage.getUserByEmail(email);
        
        if (user) {
          // Link Google account to existing email account
          await storage.updateUser(user.id, {
            googleId,
            profilePicture,
            isEmailVerified: true, // Google verified their email
          });
        }
      }

      // Create new user if doesn't exist
      if (!user) {
        if (!role) {
          return res.status(400).json({ 
            error: "Role is required for new Google sign ups",
            requiresRole: true 
          });
        }

        user = await storage.createUser({
          email: email || `google_${googleId}@placeholder.com`,
          password: null, // No password for Google users
          name,
          role,
          isEmailVerified: true, // Google already verified email
          emailVerifyToken: null,
          emailVerifyExpires: null,
          googleId,
          profilePicture,
        });
      }

      // Create session
      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, user.id);

      res.json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        sessionId,
      });
    } catch (error: any) {
      console.error("Google auth error:", error);
      res.status(500).json({ error: "Failed to authenticate with Google" });
    }
  });

  // Get current user
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let profile = null;
      if (user.role === "student") {
        profile = await storage.getStudentByUserId(user.id);
      }

      res.json({ 
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        profile 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Logout
  app.post("/api/auth/logout", requireAuth, (req, res) => {
    const sessionId = req.headers.authorization?.replace("Bearer ", "");
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.json({ success: true });
  });

  // ========== EMAIL VERIFICATION ROUTES ==========
  
  // Verify email
  app.get("/api/auth/verify-email/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const user = await storage.getUserByEmailVerifyToken(token);
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired verification token" });
      }

      // Check if already verified
      if (user.isEmailVerified) {
        return res.json({ 
          success: true,
          message: "Email already verified! You can now log in." 
        });
      }

      // Check if token is expired
      if (user.emailVerifyExpires && new Date(user.emailVerifyExpires) < new Date()) {
        return res.status(400).json({ 
          error: "Verification token has expired",
          expired: true 
        });
      }

      // Update user to verified
      await storage.updateUser(user.id, {
        isEmailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
      });

      res.json({ 
        success: true,
        message: "Email verified successfully! You can now log in." 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Resend verification email (unauthenticated endpoint)
  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      // Validate input with Zod
      const validation = resendVerificationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: validation.error.errors[0].message 
        });
      }

      const { email } = validation.data;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal whether the email exists
        return res.json({ 
          success: true,
          message: "If that email is registered, a verification link has been sent." 
        });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({ error: "Email already verified" });
      }

      // Check if a token was sent recently (within last 5 minutes to prevent spam)
      if (user.emailVerifyToken && user.emailVerifyExpires) {
        const tokenAge = Date.now() - (new Date(user.emailVerifyExpires).getTime() - (24 * 60 * 60 * 1000));
        if (tokenAge < 5 * 60 * 1000) { // 5 minutes
          return res.status(429).json({ 
            error: "A verification email was recently sent. Please check your inbox or try again in a few minutes." 
          });
        }
      }

      // Generate new verification token
      const emailVerifyToken = crypto.randomUUID();
      const emailVerifyExpires = new Date();
      emailVerifyExpires.setHours(emailVerifyExpires.getHours() + 24);

      await storage.updateUser(user.id, {
        emailVerifyToken,
        emailVerifyExpires: emailVerifyExpires.toISOString(),
      });

      // Send verification email
      await sendVerificationEmail(user.email, emailVerifyToken, user.name);

      res.json({ 
        success: true,
        message: "Verification email sent! Please check your inbox." 
        });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== FILE UPLOAD ROUTES ==========
  
  app.post("/api/upload", requireAuth, memoryUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const folder = req.body.folder || 'uploads';
      const result: any = await uploadBufferToCloudinary(
        req.file.buffer,
        req.file.originalname,
        folder
      );

      if (!result.success || !result.url || !result.publicId) {
        return res.status(500).json({ 
          error: result.error || 'File upload failed - missing URL or public ID' 
        });
      }

      res.json({ 
        success: true,
        url: result.url,
        publicId: result.publicId
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== STUDENT INVITE ROUTES ==========
  
  app.post("/api/invites/student", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "parent") {
        return res.status(403).json({ error: "Only parents can invite students" });
      }

      const data = insertStudentInviteSchema.parse(req.body);
      const token = crypto.randomUUID();
      const expiresDate = new Date();
      expiresDate.setDate(expiresDate.getDate() + 7); // 7 days expiry

      const invite = await storage.createStudentInvite({
        email: data.email,
        studentName: data.studentName,
        gradeLevel: data.gradeLevel,
        parent: { connect: { id: user.id } },
        token,
        status: "pending",
        createdDate: new Date().toISOString(),
        expiresDate: expiresDate.toISOString(),
      });

      res.json(invite);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/invites/student/parent", requireAuth, async (req, res) => {
    try {
      const invites = await storage.getStudentInvitesByParent(req.session.userId!);
      res.json(invites);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/invites/student/:token", async (req, res) => {
    try {
      const invite = await storage.getStudentInviteByToken(req.params.token);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      res.json(invite);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== STUDENT ROUTES ==========
  
  app.get("/api/students/parent", requireAuth, async (req, res) => {
    try {
      const students = await storage.getStudentsByParent(req.session.userId!);
      res.json(students);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/students/teacher", requireAuth, async (req, res) => {
    try {
      const students = await storage.getStudentsByTeacher(req.session.userId!);
      res.json(students);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/students/:id", requireAuth, async (req, res) => {
    try {
      const student = await storage.getStudentById(parseInt(req.params.id));
      res.json(student);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/students/:id", requireAuth, async (req, res) => {
    try {
      const student = await storage.updateStudent(parseInt(req.params.id), req.body);
      res.json(student);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== ASSIGNMENT ROUTES ==========
  
  app.post("/api/assignments", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res.status(403).json({ error: "Only teachers can create assignments" });
      }

      const data = insertAssignmentSchema.parse({
        ...req.body,
        teacherId: user.id,
      });

      const assignment = await storage.createAssignment(data);

      // Auto-assign to students with matching grade level
      const students = await storage.getStudentsByTeacher(user.id);
      const matchingStudents = students.filter(s => s.gradeLevel === assignment.gradeLevel);
      
      for (const student of matchingStudents) {
        await storage.createStudentAssignment({
          assignmentId: assignment.id,
          studentId: student.id,
          submission: null,
          grade: null,
          feedback: null,
          status: "pending",
          submittedAt: null,
        });
      }

      res.json(assignment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/assignments/with-file", requireAuth, memoryUpload.single('file'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res.status(403).json({ error: "Only teachers can create assignments" });
      }

      let fileUrl = null;
      if (req.file) {
        const uploadResult: any = await uploadBufferToCloudinary(
          req.file.buffer,
          req.file.originalname,
          'assignments'
        );
        if (!uploadResult.success || !uploadResult.url || !uploadResult.publicId) {
          return res.status(500).json({ 
            error: uploadResult.error || 'File upload failed - missing URL or public ID' 
          });
        }
        fileUrl = uploadResult.url;
      }

      const data = insertAssignmentSchema.parse({
        title: req.body.title,
        description: req.body.description,
        subject: req.body.subject,
        gradeLevel: parseInt(req.body.gradeLevel),
        dueDate: req.body.dueDate,
        points: parseInt(req.body.points),
        fileUrl,
        teacherId: user.id,
      });

      const assignment = await storage.createAssignment(data);

      // Auto-assign to students with matching grade level
      const students = await storage.getStudentsByTeacher(user.id);
      const matchingStudents = students.filter(s => s.gradeLevel === assignment.gradeLevel);
      
      for (const student of matchingStudents) {
        await storage.createStudentAssignment({
          assignmentId: assignment.id,
          studentId: student.id,
          submission: null,
          grade: null,
          feedback: null,
          status: "pending",
          submittedAt: null,
        });
      }

      res.json(assignment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/assignments/teacher", requireAuth, async (req, res) => {
    try {
      const assignments = await storage.getAssignmentsByTeacher(req.session.userId!);
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/assignments/student/:studentId", requireAuth, async (req, res) => {
    try {
      const studentAssignments = await storage.getStudentAssignmentsByStudent(parseInt(req.params.studentId));
      
      // Get full assignment details
      const assignments = await Promise.all(
        studentAssignments.map(async (sa) => {
          const assignment = await storage.getAssignmentById(sa.assignmentId);
          return { ...assignment, studentAssignment: sa };
        })
      );

      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/assignments/:id", requireAuth, async (req, res) => {
    try {
      const assignment = await storage.updateAssignment(parseInt(req.params.id), req.body);
      res.json(assignment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/assignments/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteAssignment(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== STUDENT ASSIGNMENT ROUTES ==========
  
  app.patch("/api/student-assignments/:id/submit", requireAuth, async (req, res) => {
    try {
      const { submission } = req.body;
      const sa = await storage.updateStudentAssignment(parseInt(req.params.id), {
        submission,
        status: "submitted",
        submittedAt: new Date().toISOString(),
      });
      res.json(sa);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/student-assignments/:id/grade", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res.status(403).json({ error: "Only teachers can grade assignments" });
      }

      const { grade, feedback } = req.body;
      const sa = await storage.updateStudentAssignment(parseInt(req.params.id), {
        grade,
        feedback,
        status: "graded",
      });

      // Award points to student
      const studentAssignment = await storage.getStudentAssignmentById(parseInt(req.params.id));
      if (studentAssignment) {
        const assignment = await storage.getAssignmentById(studentAssignment.assignmentId);
        const student = await storage.getStudentById(studentAssignment.studentId);
        if (assignment && student && grade >= 70) {
          await storage.updateStudent(student.id, {
            points: student.points + assignment.points,
          });
        }
      }

      res.json(sa);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/student-assignments/assignment/:assignmentId", requireAuth, async (req, res) => {
    try {
      const studentAssignments = await storage.getStudentAssignmentsByAssignment(parseInt(req.params.assignmentId));
      
      // Get student details for each
      const withStudents = await Promise.all(
        studentAssignments.map(async (sa) => {
          const student = await storage.getStudentById(sa.studentId);
          return { ...sa, student };
        })
      );

      res.json(withStudents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== MATERIAL ROUTES ==========
  
  app.post("/api/materials", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res.status(403).json({ error: "Only teachers can upload materials" });
      }

      const data = insertMaterialSchema.parse({
        ...req.body,
        teacherId: user.id,
        uploadDate: new Date().toISOString(),
      });

      const material = await storage.createMaterial(data);
      res.json(material);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/materials/with-file", requireAuth, memoryUpload.single('file'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res.status(403).json({ error: "Only teachers can upload materials" });
      }

      let fileUrl = null;
      if (req.file) {
        const uploadResult: any = await uploadBufferToCloudinary(
          req.file.buffer,
          req.file.originalname,
          'materials'
        );
        if (!uploadResult.success || !uploadResult.url || !uploadResult.publicId) {
          return res.status(500).json({ 
            error: uploadResult.error || 'File upload failed - missing URL or public ID' 
          });
        }
        fileUrl = uploadResult.url;
      }

      const data = insertMaterialSchema.parse({
        title: req.body.title,
        subject: req.body.subject,
        gradeLevel: parseInt(req.body.gradeLevel),
        fileUrl,
        teacherId: user.id,
        uploadDate: new Date().toISOString(),
      });

      const material = await storage.createMaterial(data);
      res.json(material);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/materials/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      const material = await storage.getMaterialById(parseInt(req.params.id));
      
      if (!material) {
        return res.status(404).json({ error: "Material not found" });
      }

      // Only teachers can view individual materials, and only their own
      if (user?.role !== "teacher" || material.teacherId !== user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      res.json(material);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/materials/teacher", requireAuth, async (req, res) => {
    try {
      const materials = await storage.getMaterialsByTeacher(req.session.userId!);
      res.json(materials);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/materials/student/:studentId", requireAuth, async (req, res) => {
    try {
      const student = await storage.getStudentById(parseInt(req.params.studentId));
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      const materials = await storage.getMaterialsByGradeLevel(student.gradeLevel);
      res.json(materials);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/materials/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res.status(403).json({ error: "Only teachers can update materials" });
      }

      // Check if material exists and belongs to the requesting teacher
      const existingMaterial = await storage.getMaterialById(parseInt(req.params.id));
      if (!existingMaterial) {
        return res.status(404).json({ error: "Material not found" });
      }
      if (existingMaterial.teacherId !== user.id) {
        return res.status(403).json({ error: "You can only update your own materials" });
      }

      // Validate update data (excludes immutable fields like teacherId and uploadDate)
      const validatedData = updateMaterialSchema.parse(req.body);

      const material = await storage.updateMaterial(parseInt(req.params.id), validatedData);
      res.json(material);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/materials/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res.status(403).json({ error: "Only teachers can delete materials" });
      }

      // Check if material exists and belongs to the requesting teacher
      const existingMaterial = await storage.getMaterialById(parseInt(req.params.id));
      if (!existingMaterial) {
        return res.status(404).json({ error: "Material not found" });
      }
      if (existingMaterial.teacherId !== user.id) {
        return res.status(403).json({ error: "You can only delete your own materials" });
      }

      await storage.deleteMaterial(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== SCHEDULE ROUTES ==========
  
  app.post("/api/schedules", requireAuth, async (req, res) => {
    try {
      const data = insertScheduleSchema.parse(req.body);
      const schedule = await storage.createSchedule(data);
      res.json(schedule);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/schedules/teacher", requireAuth, async (req, res) => {
    try {
      const schedules = await storage.getSchedulesByTeacher(req.session.userId!);
      res.json(schedules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/schedules/student/:studentId", requireAuth, async (req, res) => {
    try {
      const schedules = await storage.getSchedulesByStudent(parseInt(req.params.studentId));
      res.json(schedules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/schedules/:id", requireAuth, async (req, res) => {
    try {
      const schedule = await storage.updateSchedule(parseInt(req.params.id), req.body);
      res.json(schedule);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/schedules/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteSchedule(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== SESSION ROUTES ==========
  
  app.post("/api/sessions", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res.status(403).json({ error: "Only teachers can create sessions" });
      }

      const data = insertSessionSchema.parse(req.body);

      const session = await storage.createSession({
        title: data.title,
        description: data.description,
        subject: data.subject,
        sessionDate: data.sessionDate,
        startTime: data.startTime,
        endTime: data.endTime,
        meetingUrl: data.meetingUrl,
        notes: data.notes,
        status: data.status,
        studentIds: data.studentIds,
        teacher: { connect: { id: user.id } },
      });
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sessions/teacher", requireAuth, async (req, res) => {
    try {
      const sessions = await storage.getSessionsByTeacher(req.session.userId!);
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sessions/student/:studentId", requireAuth, async (req, res) => {
    try {
      const sessions = await storage.getSessionsByStudent(parseInt(req.params.studentId));
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/sessions/:id", requireAuth, async (req, res) => {
    try {
      const session = await storage.updateSession(parseInt(req.params.id), req.body);
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== FEEDBACK ROUTES ==========
  
  app.post("/api/feedback", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res.status(403).json({ error: "Only teachers can give feedback" });
      }

      const data = insertFeedbackSchema.parse({
        ...req.body,
        teacherId: user.id,
        date: new Date().toISOString(),
      });

      const feedback = await storage.createFeedback(data);
      res.json(feedback);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/feedback/student/:studentId", requireAuth, async (req, res) => {
    try {
      const feedback = await storage.getFeedbackByStudent(parseInt(req.params.studentId));
      res.json(feedback);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/feedback/teacher", requireAuth, async (req, res) => {
    try {
      const feedback = await storage.getFeedbackByTeacher(req.session.userId!);
      res.json(feedback);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== ATTENDANCE ROUTES ==========
  
  app.post("/api/attendance", requireAuth, async (req, res) => {
    try {
      const data = insertAttendanceSchema.parse(req.body);
      const attendance = await storage.createAttendance(data);
      res.json(attendance);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/attendance/student/:studentId", requireAuth, async (req, res) => {
    try {
      const attendance = await storage.getAttendanceByStudent(parseInt(req.params.studentId));
      res.json(attendance);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/attendance/:id", requireAuth, async (req, res) => {
    try {
      const attendance = await storage.updateAttendance(parseInt(req.params.id), req.body);
      res.json(attendance);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== PAYMENT ROUTES ==========
  
  app.post("/api/payments", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "parent") {
        return res.status(403).json({ error: "Only parents can make payments" });
      }

      const data = insertPaymentSchema.parse({
        ...req.body,
        parentId: user.id,
        date: new Date().toISOString(),
      });

      const payment = await storage.createPayment(data);

      // If payment is for teacher, create earnings record
      if (data.teacherId) {
        await storage.createEarnings({
          teacherId: data.teacherId,
          amount: data.amount,
          date: new Date().toISOString(),
          source: "parent_payment",
          description: data.description,
        });
      }

      res.json(payment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/payments/parent", requireAuth, async (req, res) => {
    try {
      const payments = await storage.getPaymentsByParent(req.session.userId!);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/payments/teacher", requireAuth, async (req, res) => {
    try {
      const payments = await storage.getPaymentsByTeacher(req.session.userId!);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/payments/:id", requireAuth, async (req, res) => {
    try {
      const payment = await storage.updatePayment(parseInt(req.params.id), req.body);
      res.json(payment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== TUTOR REQUEST ROUTES ==========
  
  app.post("/api/tutor-requests", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "parent") {
        return res.status(403).json({ error: "Only parents can request tutors" });
      }

      const data = insertTutorRequestSchema.parse({
        ...req.body,
        parentId: user.id,
        status: "pending",
        requestDate: new Date().toISOString(),
        responseDate: null,
      });

      const request = await storage.createTutorRequest(data);
      res.json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tutor-requests/parent", requireAuth, async (req, res) => {
    try {
      const requests = await storage.getTutorRequestsByParent(req.session.userId!);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tutor-requests/teacher", requireAuth, async (req, res) => {
    try {
      const requests = await storage.getTutorRequestsByTeacher(req.session.userId!);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/tutor-requests/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res.status(403).json({ error: "Only teachers can respond to requests" });
      }

      const { status } = req.body;
      const request = await storage.updateTutorRequest(parseInt(req.params.id), {
        status,
        responseDate: new Date().toISOString(),
      });

      res.json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== MESSAGE ROUTES ==========
  
  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const data = insertMessageSchema.parse({
        ...req.body,
        senderId: req.session.userId!,
        timestamp: new Date().toISOString(),
        isRead: false,
      });

      const message = await storage.createMessage(data);
      res.json(message);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/messages/:userId", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getMessagesBetweenUsers(
        req.session.userId!,
        parseInt(req.params.userId)
      );
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/messages", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getMessagesByUser(req.session.userId!);
      
      // Group by conversation
      const conversations = new Map();
      for (const msg of messages) {
        const otherId = msg.senderId === req.session.userId! ? msg.receiverId : msg.senderId;
        if (!conversations.has(otherId)) {
          const otherUser = await storage.getUserById(otherId);
          conversations.set(otherId, {
            userId: otherId,
            userName: otherUser?.name,
            lastMessage: msg,
            unreadCount: 0,
          });
        }
        if (!msg.isRead && msg.receiverId === req.session.userId!) {
          conversations.get(otherId).unreadCount++;
        }
      }

      res.json(Array.from(conversations.values()));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/messages/:id/read", requireAuth, async (req, res) => {
    try {
      const message = await storage.markMessageAsRead(parseInt(req.params.id));
      res.json(message);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== PROGRESS REPORT ROUTES ==========
  
  app.post("/api/progress-reports", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res.status(403).json({ error: "Only teachers can create reports" });
      }

      const data = insertProgressReportSchema.parse({
        ...req.body,
        teacherId: user.id,
        date: new Date().toISOString(),
      });

      const report = await storage.createProgressReport(data);
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/progress-reports/student/:studentId", requireAuth, async (req, res) => {
    try {
      const reports = await storage.getProgressReportsByStudent(parseInt(req.params.studentId));
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/progress-reports/teacher", requireAuth, async (req, res) => {
    try {
      const reports = await storage.getProgressReportsByTeacher(req.session.userId!);
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== CLARIFICATION ROUTES ==========
  
  app.post("/api/clarifications", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      const student = await storage.getStudentByUserId(user!.id);
      if (!student) {
        return res.status(403).json({ error: "Only students can request clarifications" });
      }

      const data = insertClarificationSchema.parse({
        ...req.body,
        studentId: student.id,
        answer: null,
        askedDate: new Date().toISOString(),
        answeredDate: null,
        status: "pending",
      });

      const clarification = await storage.createClarification(data);
      res.json(clarification);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/clarifications/student/:studentId", requireAuth, async (req, res) => {
    try {
      const clarifications = await storage.getClarificationsByStudent(parseInt(req.params.studentId));
      res.json(clarifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/clarifications/assignment/:assignmentId", requireAuth, async (req, res) => {
    try {
      const clarifications = await storage.getClarificationsByAssignment(parseInt(req.params.assignmentId));
      res.json(clarifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/clarifications/:id", requireAuth, async (req, res) => {
    try {
      const { answer } = req.body;
      const clarification = await storage.updateClarification(parseInt(req.params.id), {
        answer,
        answeredDate: new Date().toISOString(),
        status: "answered",
      });
      res.json(clarification);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== PARENTAL CONTROL ROUTES ==========
  
  app.post("/api/parental-controls", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "parent") {
        return res.status(403).json({ error: "Only parents can set controls" });
      }

      const data = insertParentalControlSchema.parse({
        ...req.body,
        parentId: user.id,
      });

      const control = await storage.createParentalControl(data);
      res.json(control);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/parental-controls/student/:studentId", requireAuth, async (req, res) => {
    try {
      const control = await storage.getParentalControlByStudent(parseInt(req.params.studentId));
      res.json(control);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/parental-controls/:id", requireAuth, async (req, res) => {
    try {
      const control = await storage.updateParentalControl(parseInt(req.params.id), req.body);
      res.json(control);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== TUTOR RATING ROUTES ==========
  
  app.post("/api/tutor-ratings", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "parent") {
        return res.status(403).json({ error: "Only parents can rate tutors" });
      }

      const data = insertTutorRatingSchema.parse({
        ...req.body,
        parentId: user.id,
        date: new Date().toISOString(),
      });

      const rating = await storage.createTutorRating(data);
      res.json(rating);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tutor-ratings/teacher/:teacherId", requireAuth, async (req, res) => {
    try {
      const ratings = await storage.getRatingsByTeacher(parseInt(req.params.teacherId));
      res.json(ratings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== EARNINGS ROUTES ==========
  
  app.get("/api/earnings/teacher", requireAuth, async (req, res) => {
    try {
      const earnings = await storage.getEarningsByTeacher(req.session.userId!);
      res.json(earnings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== TEACHERS LIST ==========
  
  app.get("/api/teachers", requireAuth, async (req, res) => {
    try {
      // This would normally query all teachers, for now return empty
      // In a real app, you'd have a proper users table query
      res.json([]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
