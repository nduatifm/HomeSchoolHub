import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import prisma from "./db";
import { z } from "zod";
import {
  insertUserSchema,
  insertStudentSchema,
  insertAssignmentSchema,
  updateAssignmentSchema,
  insertStudentAssignmentSchema,
  insertMaterialSchema,
  updateMaterialSchema,
  insertScheduleSchema,
  insertSessionSchema,
  updateSessionSchema,
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
import {
  sendVerificationEmail,
  sendStudentInviteEmail,
} from "./utils/emailService";
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
async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
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
          error: validation.error.errors[0].message,
        });
      }

      const { email, password, name, role } = validation.data;

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        if (!existing.isEmailVerified) {
          return res.status(400).json({ 
            error: "Email already registered but not verified",
            requiresVerification: true,
            email: existing.email
          });
        }
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
      sendVerificationEmail(email, name, emailVerifyToken).catch((err) =>
        console.error("Failed to send verification email:", err),
      );

      // Do NOT create session until email is verified
      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        message:
          "Signup successful! Please check your email to verify your account before logging in.",
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
          error: validation.error.errors[0].message,
        });
      }

      const { email, password } = validation.data;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check if user password exists (for non-Google OAuth users)
      if (!user.password) {
        return res
          .status(401)
          .json({ error: "Invalid credentials. Please use Google Sign In." });
      }

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        return res.status(403).json({
          error: "Please verify your email before logging in",
          needsVerification: true,
        });
      }

      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, user.id);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        sessionId,
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
          error: validation.error.errors[0].message,
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

      // Create user account - mark as verified since invite code IS the verification
      const hashedPassword = await hashPassword(password);

      const user = await storage.createUser({
        email: invite.email,
        password: hashedPassword,
        name: invite.studentName,
        role: "student",
        isEmailVerified: true, // Verified via invite code
        emailVerifyToken: null,
        emailVerifyExpires: null,
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

      // Check if tutor request mode is OFF - if so, auto-assign to a teacher
      const tutorRequestModeSetting =
        await storage.getSystemSetting("TUTOR_REQUEST_MODE");
      const isTutorRequestMode = tutorRequestModeSetting?.value === "true";

      if (!isTutorRequestMode) {
        // Auto-assign student to the first available teacher
        await storage.assignStudentToFirstAvailableTeacher(student.id);
      }

      // Mark invite as accepted
      await storage.updateStudentInvite(invite.id, { status: "accepted" });

      // Create session immediately - student verified via invite code
      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, user.id);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        student,
        sessionId,
        message: "Welcome! Your account has been created successfully.",
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
        return res
          .status(400)
          .json({ error: "Invalid role for Google sign up" });
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
            requiresRole: true,
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
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
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
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          profilePicture: user.profilePicture,
          isEmailVerified: user.isEmailVerified,
          googleId: user.googleId,
          bio: user.bio,
          teachingSubjects: user.teachingSubjects,
          yearsExperience: user.yearsExperience,
          qualifications: user.qualifications,
          specialization: user.specialization,
          phone: user.phone,
          preferredContact: user.preferredContact,
          interests: user.interests,
          favoriteSubject: user.favoriteSubject,
          learningGoals: user.learningGoals,
        },
        profile,
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

  // Get all users (for messaging)
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Exclude current user from the list
      const filteredUsers = users.filter((u) => u.id !== req.session.userId);
      res.json(filteredUsers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== EMAIL VERIFICATION ROUTES ==========

  // Verify email
  app.get("/api/auth/verify-email/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const user = await storage.getUserByEmailVerifyToken(token);
      if (!user) {
        return res
          .status(400)
          .json({ error: "Invalid or expired verification token" });
      }

      // Check if already verified
      if (user.isEmailVerified) {
        return res.json({
          success: true,
          message: "Email already verified! You can now log in.",
        });
      }

      // Check if token is expired
      if (
        user.emailVerifyExpires &&
        new Date(user.emailVerifyExpires) < new Date()
      ) {
        return res.status(400).json({
          error: "Verification token has expired",
          expired: true,
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
        message: "Email verified successfully! You can now log in.",
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
          error: validation.error.errors[0].message,
        });
      }

      const { email } = validation.data;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal whether the email exists
        return res.json({
          success: true,
          message:
            "If that email is registered, a verification link has been sent.",
        });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({ error: "Email already verified" });
      }

      // Check if a token was sent recently (within last 5 minutes to prevent spam)
      if (user.emailVerifyToken && user.emailVerifyExpires) {
        const tokenAge =
          Date.now() -
          (new Date(user.emailVerifyExpires).getTime() - 24 * 60 * 60 * 1000);
        if (tokenAge < 5 * 60 * 1000) {
          // 5 minutes
          return res.status(429).json({
            error:
              "A verification email was recently sent. Please check your inbox or try again in a few minutes.",
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
      await sendVerificationEmail(user.email, user.name, emailVerifyToken);

      res.json({
        success: true,
        message: "Verification email sent! Please check your inbox.",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== USER PROFILE ROUTES ==========

  // Update profile
  app.patch("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const updateProfileSchema = z.object({
        name: z.string().min(1, "Name is required").max(100, "Name too long"),
      });

      const validation = updateProfileSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: validation.error.errors[0].message,
        });
      }

      const { name } = validation.data;
      const user = await storage.updateUser(req.session.userId!, { name });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          profilePicture: user.profilePicture,
          isEmailVerified: user.isEmailVerified,
          googleId: user.googleId,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update profile picture
  app.patch("/api/user/profile-picture", requireAuth, async (req, res) => {
    try {
      const updatePictureSchema = z.object({
        profilePicture: z
          .string()
          .url("Must be a valid URL")
          .startsWith(
            "https://res.cloudinary.com/",
            "Profile picture must be uploaded through Cloudinary",
          ),
      });

      const validation = updatePictureSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: validation.error.errors[0].message,
        });
      }

      const { profilePicture } = validation.data;
      const user = await storage.updateUser(req.session.userId!, {
        profilePicture,
      });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          profilePicture: user.profilePicture,
          isEmailVerified: user.isEmailVerified,
          googleId: user.googleId,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Change password
  app.post("/api/user/change-password", requireAuth, async (req, res) => {
    try {
      const changePasswordSchema = z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z
          .string()
          .min(8, "New password must be at least 8 characters")
          .max(100, "New password too long"),
      });

      const validation = changePasswordSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: validation.error.errors[0].message,
        });
      }

      const { currentPassword, newPassword } = validation.data;

      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if user has a password (not Google OAuth)
      if (!user.password) {
        return res.status(400).json({
          error: "Cannot change password for Google sign-in accounts",
        });
      }

      // Verify current password
      const isValid = await verifyPassword(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Hash and update new password
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(user.id, { password: hashedPassword });

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update bio and role-specific details
  app.patch("/api/user/profile-details", requireAuth, async (req, res) => {
    try {
      const updateDetailsSchema = z.object({
        bio: z.string().max(500, "Bio too long").optional(),
        // Teacher fields
        teachingSubjects: z.array(z.string()).optional(),
        yearsExperience: z.number().int().min(0).max(100).optional(),
        qualifications: z.string().max(200).optional(),
        specialization: z.string().max(100).optional(),
        // Parent fields
        phone: z.string().max(20).optional(),
        preferredContact: z.string().max(50).optional(),
        // Student fields
        interests: z.array(z.string()).optional(),
        favoriteSubject: z.string().max(100).optional(),
        learningGoals: z.string().max(500).optional(),
      });

      const validation = updateDetailsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: validation.error.errors[0].message,
        });
      }

      const updateData = validation.data;
      const user = await storage.updateUser(req.session.userId!, updateData);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          profilePicture: user.profilePicture,
          isEmailVerified: user.isEmailVerified,
          googleId: user.googleId,
          bio: user.bio,
          teachingSubjects: user.teachingSubjects,
          yearsExperience: user.yearsExperience,
          qualifications: user.qualifications,
          specialization: user.specialization,
          phone: user.phone,
          preferredContact: user.preferredContact,
          interests: user.interests,
          favoriteSubject: user.favoriteSubject,
          learningGoals: user.learningGoals,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== FILE UPLOAD ROUTES ==========

  app.post(
    "/api/upload",
    requireAuth,
    memoryUpload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file provided" });
        }

        const folder = req.body.folder || "uploads";
        const result: any = await uploadBufferToCloudinary(
          req.file.buffer,
          req.file.originalname,
          folder,
        );

        if (!result.success || !result.url || !result.publicId) {
          return res.status(500).json({
            error:
              result.error || "File upload failed - missing URL or public ID",
          });
        }

        res.json({
          success: true,
          url: result.url,
          publicId: result.publicId,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    },
  );

  // ========== STUDENT INVITE ROUTES ==========

  app.post("/api/invites/student", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "parent") {
        return res
          .status(403)
          .json({ error: "Only parents can invite students" });
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

      // Send invite email with URL and invite code (non-blocking)
      sendStudentInviteEmail(
        data.email,
        data.studentName,
        token,
        user.name,
      ).catch((err) =>
        console.error("Failed to send student invite email:", err),
      );

      res.json(invite);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/invites/student/parent", requireAuth, async (req, res) => {
    try {
      const invites = await storage.getStudentInvitesByParent(
        req.session.userId!,
      );
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

  app.delete("/api/invites/student/:token", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "parent") {
        return res.status(403).json({ error: "Only parents can revoke invites" });
      }
      const invite = await storage.getStudentInviteByToken(req.params.token);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      if (invite.parentId !== user.id) {
        return res.status(403).json({ error: "Not your invite" });
      }
      await storage.deleteStudentInvite(req.params.token);
      res.json({ success: true });
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
      // Check if tutor request mode is enabled
      const isTutorRequestMode = await isTutorRequestModeEnabled();

      let students;
      if (isTutorRequestMode) {
        // When tutor request mode is ON, use the old flow (students from approved requests)
        students = await storage.getStudentsByTeacher(req.session.userId!);
      } else {
        // When tutor request mode is OFF, show ALL students
        students = await storage.getAllStudentsForTeachers();
      }
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
      const student = await storage.updateStudent(
        parseInt(req.params.id),
        req.body,
      );
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
        return res
          .status(403)
          .json({ error: "Only teachers can create assignments" });
      }

      const data = insertAssignmentSchema.parse({
        ...req.body,
        points: 0,
        teacherId: user.id,
      });

      const assignment = await storage.createAssignment(data);

      // Auto-assign to students with matching grade level
      const students = await storage.getStudentsByTeacher(user.id);
      const matchingStudents = students.filter(
        (s) => s.gradeLevel === assignment.gradeLevel,
      );

      for (const student of matchingStudents) {
        await storage.createStudentAssignment({
          assignmentId: assignment.id,
          studentId: student.id,
          submission: null,
          fileUrl: null,
          notes: null,
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

  app.post(
    "/api/assignments/with-file",
    requireAuth,
    memoryUpload.single("file"),
    async (req, res) => {
      try {
        const user = await storage.getUserById(req.session.userId!);
        if (user?.role !== "teacher") {
          return res
            .status(403)
            .json({ error: "Only teachers can create assignments" });
        }

        let fileUrl = null;
        if (req.file) {
          const uploadResult: any = await uploadBufferToCloudinary(
            req.file.buffer,
            req.file.originalname,
            "assignments",
          );
          if (
            !uploadResult.success ||
            !uploadResult.url ||
            !uploadResult.publicId
          ) {
            return res.status(500).json({
              error:
                uploadResult.error ||
                "File upload failed - missing URL or public ID",
            });
          }
          fileUrl = uploadResult.url;
        }

        const data = insertAssignmentSchema.parse({
          title: req.body.title,
          description: req.body.description,
          subject: req.body.subject,
          gradeLevel: req.body.gradeLevel,
          dueDate: req.body.dueDate,
          points: 0,
          fileUrl,
          teacherId: user.id,
        });

        const assignment = await storage.createAssignment(data);

        // Auto-assign to students with matching grade level
        const students = await storage.getStudentsByTeacher(user.id);
        const matchingStudents = students.filter(
          (s) => s.gradeLevel === assignment.gradeLevel,
        );

        for (const student of matchingStudents) {
          await storage.createStudentAssignment({
            assignmentId: assignment.id,
            studentId: student.id,
            submission: null,
            fileUrl: null,
            notes: null,
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
    },
  );

  app.get("/api/assignments/teacher", requireAuth, async (req, res) => {
    try {
      const assignments = await storage.getAssignmentsByTeacher(
        req.session.userId!,
      );
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get(
    "/api/assignments/student/:studentId",
    requireAuth,
    async (req, res) => {
      try {
        const studentId = parseInt(req.params.studentId);
        const isTutorRequestMode = await isTutorRequestModeEnabled();

        if (isTutorRequestMode) {
          // When tutor request mode is ON, only show assigned assignments
          const studentAssignments =
            await storage.getStudentAssignmentsByStudent(studentId);

          const assignments = await Promise.all(
            studentAssignments.map(async (sa) => {
              const assignment = await storage.getAssignmentById(
                sa.assignmentId,
              );
              const teacher = await storage.getUserById(assignment?.teacherId || 0);
              return { 
                ...assignment, 
                studentAssignment: sa,
                teacherName: teacher?.name || null
              };
            }),
          );
          res.json(assignments);
        } else {
          // When tutor request mode is OFF, show assignments from assigned teachers
          const student = await storage.getStudentById(studentId);
          const allAssignments = await storage.getAllAssignments();

          // Get teachers assigned to this student
          const assignedTeachers =
            await storage.getAssignedTeachersForStudent(studentId);
          const assignedTeacherIds = new Set(
            assignedTeachers.map((t) => t.teacherId),
          );

          // Get any existing student assignments to show submission status
          const studentAssignments =
            await storage.getStudentAssignmentsByStudent(studentId);
          const studentAssignmentMap = new Map(
            studentAssignments.map((sa) => [sa.assignmentId, sa]),
          );

          // Return assignments from assigned teachers OR matching grade level
          const assignmentsWithTeachers = await Promise.all(
            allAssignments
              .filter((a) => {
                // Include if from an assigned teacher
                if (assignedTeacherIds.has(a.teacherId)) return true;
                // Or if matching grade level (for general assignments)
                return (
                  !student?.gradeLevel || a.gradeLevel === student.gradeLevel
                );
              })
              .map(async (assignment) => {
                const teacher = await storage.getUserById(assignment.teacherId);
                return {
                  ...assignment,
                  studentAssignment:
                    studentAssignmentMap.get(assignment.id) || null,
                  teacherName: teacher?.name || null
                };
              })
          );

          res.json(assignmentsWithTeachers);
        }
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    },
  );

  app.get("/api/assignments/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      const assignment = await storage.getAssignmentById(
        parseInt(req.params.id),
      );

      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      // Only teachers can view individual assignments, and only their own
      if (user?.role !== "teacher" || assignment.teacherId !== user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      res.json(assignment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/assignments/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res
          .status(403)
          .json({ error: "Only teachers can update assignments" });
      }

      // Check if assignment exists and belongs to the requesting teacher
      const existingAssignment = await storage.getAssignmentById(
        parseInt(req.params.id),
      );
      if (!existingAssignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      if (existingAssignment.teacherId !== user.id) {
        return res
          .status(403)
          .json({ error: "You can only update your own assignments" });
      }

      // Validate update data (excludes immutable fields like teacherId)
      const validatedData = updateAssignmentSchema.parse(req.body);

      const assignment = await storage.updateAssignment(
        parseInt(req.params.id),
        validatedData,
      );
      res.json(assignment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/assignments/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res
          .status(403)
          .json({ error: "Only teachers can delete assignments" });
      }

      // Check if assignment exists and belongs to the requesting teacher
      const existingAssignment = await storage.getAssignmentById(
        parseInt(req.params.id),
      );
      if (!existingAssignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      if (existingAssignment.teacherId !== user.id) {
        return res
          .status(403)
          .json({ error: "You can only delete your own assignments" });
      }

      await storage.deleteAssignment(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== STUDENT ASSIGNMENT ROUTES ==========

  app.patch(
    "/api/student-assignments/:id/submit",
    requireAuth,
    memoryUpload.single("file"),
    async (req: any, res) => {
      try {
        const { submission, notes } = req.body;
        let fileUrl = null;

        if (req.file) {
          const result = await uploadBufferToCloudinary(
            req.file.buffer,
            req.file.originalname,
          );
          if (result.success && result.url) {
            fileUrl = result.url;
          }
        }

        const sa = await storage.updateStudentAssignment(
          parseInt(req.params.id),
          {
            submission,
            fileUrl,
            notes: notes || null,
            status: "submitted",
            submittedAt: new Date().toISOString(),
          },
        );
        res.json(sa);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    },
  );

  // Submit assignment by assignment ID (creates StudentAssignment if needed)
  app.post(
    "/api/assignments/:assignmentId/submit",
    requireAuth,
    memoryUpload.single("file"),
    async (req: any, res) => {
      try {
        const assignmentId = parseInt(req.params.assignmentId);
        const { studentId, submission, notes } = req.body;
        let fileUrl = null;

        if (req.file) {
          const result = await uploadBufferToCloudinary(
            req.file.buffer,
            req.file.originalname,
          );
          if (result.success && result.url) {
            fileUrl = result.url;
          }
        }

        // Check if StudentAssignment already exists
        const existingAssignments =
          await storage.getStudentAssignmentsByStudent(parseInt(studentId));
        let studentAssignment = existingAssignments.find(
          (sa) => sa.assignmentId === assignmentId,
        );

        if (!studentAssignment) {
          // Create StudentAssignment record
          studentAssignment = await storage.createStudentAssignment({
            assignmentId,
            studentId: parseInt(studentId),
            submission,
            fileUrl,
            notes: notes || null,
            grade: null,
            feedback: null,
            status: "submitted",
            submittedAt: new Date().toISOString(),
          });
        } else {
          // Update existing StudentAssignment
          studentAssignment = await storage.updateStudentAssignment(
            studentAssignment.id,
            {
              submission,
              fileUrl,
              notes: notes || null,
              status: "submitted",
              submittedAt: new Date().toISOString(),
            },
          );
        }

        res.json(studentAssignment);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    },
  );

  app.patch(
    "/api/student-assignments/:id/grade",
    requireAuth,
    async (req, res) => {
      try {
        const user = await storage.getUserById(req.session.userId!);
        if (user?.role !== "teacher") {
          return res
            .status(403)
            .json({ error: "Only teachers can grade assignments" });
        }

        // Verify the teacher owns the assignment being graded
        const studentAssignment = await storage.getStudentAssignmentById(
          parseInt(req.params.id),
        );
        if (!studentAssignment) {
          return res.status(404).json({ error: "Submission not found" });
        }

        const assignment = await storage.getAssignmentById(
          studentAssignment.assignmentId,
        );
        if (!assignment || assignment.teacherId !== user.id) {
          return res
            .status(403)
            .json({ error: "You can only grade your own assignments" });
        }

        const { grade, feedback } = req.body;
        const sa = await storage.updateStudentAssignment(
          parseInt(req.params.id),
          {
            grade,
            feedback,
            status: "graded",
          },
        );

        // Award points to student
        const student = await storage.getStudentById(
          studentAssignment.studentId,
        );
        if (assignment && student && grade >= 70) {
          await storage.updateStudent(student.id, {
            points: student.points + assignment.points,
          });
        }

        res.json(sa);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    },
  );

  app.get(
    "/api/student-assignments/assignment/:assignmentId",
    requireAuth,
    async (req, res) => {
      try {
        const studentAssignments =
          await storage.getStudentAssignmentsByAssignment(
            parseInt(req.params.assignmentId),
          );

        // Get student details for each
        const withStudents = await Promise.all(
          studentAssignments.map(async (sa) => {
            const student = await storage.getStudentById(sa.studentId);
            return { ...sa, student };
          }),
        );

        res.json(withStudents);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    },
  );

  // Get all student submissions for a teacher's assignments
  app.get("/api/student-submissions/teacher", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res
          .status(403)
          .json({ error: "Only teachers can view submissions" });
      }

      // Get all assignments created by this teacher
      const teacherAssignments = await storage.getAssignmentsByTeacher(user.id);

      // For each assignment, get all student submissions
      const allSubmissions = [];
      for (const assignment of teacherAssignments) {
        const studentAssignments =
          await storage.getStudentAssignmentsByAssignment(assignment.id);

        for (const sa of studentAssignments) {
          // Only include submitted or graded assignments
          if (sa.status === "submitted" || sa.status === "graded") {
            const student = await storage.getStudentById(sa.studentId);
            allSubmissions.push({
              ...sa,
              assignment,
              student,
            });
          }
        }
      }

      res.json(allSubmissions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== MATERIAL ROUTES ==========

  app.post("/api/materials", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res
          .status(403)
          .json({ error: "Only teachers can upload materials" });
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

  app.post(
    "/api/materials/with-file",
    requireAuth,
    memoryUpload.single("file"),
    async (req, res) => {
      try {
        const user = await storage.getUserById(req.session.userId!);
        if (user?.role !== "teacher") {
          return res
            .status(403)
            .json({ error: "Only teachers can upload materials" });
        }

        let fileUrl = null;
        if (req.file) {
          const uploadResult: any = await uploadBufferToCloudinary(
            req.file.buffer,
            req.file.originalname,
            "materials",
          );
          if (
            !uploadResult.success ||
            !uploadResult.url ||
            !uploadResult.publicId
          ) {
            return res.status(500).json({
              error:
                uploadResult.error ||
                "File upload failed - missing URL or public ID",
            });
          }
          fileUrl = uploadResult.url;
        }

        const data = insertMaterialSchema.parse({
          title: req.body.title,
          description: req.body.description || null,
          subject: req.body.subject,
          gradeLevel: req.body.gradeLevel,
          fileUrl,
          teacherId: user.id,
          uploadDate: new Date().toISOString(),
        });

        const material = await storage.createMaterial(data);
        res.json(material);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    },
  );

  app.get("/api/materials/teacher", requireAuth, async (req, res) => {
    try {
      const materials = await storage.getMaterialsByTeacher(
        req.session.userId!,
      );
      res.json(materials);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get(
    "/api/materials/student/:studentId",
    requireAuth,
    async (req, res) => {
      try {
        const studentId = parseInt(req.params.studentId);
        const student = await storage.getStudentById(studentId);
        if (!student) {
          return res.status(404).json({ error: "Student not found" });
        }

        const isTutorRequestMode = await isTutorRequestModeEnabled();

        let materials;
        if (isTutorRequestMode) {
          // When tutor request mode is ON, filter by grade level
          materials = await storage.getMaterialsByGradeLevel(
            student.gradeLevel,
          );
        } else {
          // When tutor request mode is OFF, show ALL materials
          materials = await storage.getAllMaterials();
        }

        // Add teacher name to each material
        const materialsWithTeacher = await Promise.all(
          materials.map(async (material) => {
            const teacher = await storage.getUserById(material.teacherId);
            return {
              ...material,
              teacherName: teacher?.name || null
            };
          })
        );

        res.json(materialsWithTeacher);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    },
  );

  app.get("/api/teachers/student/:studentId", requireAuth, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const student = await storage.getStudentById(studentId);
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Authorization: the student themselves, the student's parent, or an assigned/approved teacher
      const requestingUser = await storage.getUserById(req.session.userId!);
      if (!requestingUser) return res.status(401).json({ error: "Unauthorized" });

      const isOwnStudent = requestingUser.role === "student" && student.userId === requestingUser.id;
      const isParent = requestingUser.role === "parent" && student.parentId === requestingUser.id;

      let isAssignedTeacher = false;
      if (requestingUser.role === "teacher") {
        const teacherAssignments = await storage.getAssignedTeachersForStudent(studentId);
        isAssignedTeacher = teacherAssignments.some((a) => a.teacherId === requestingUser.id);
        if (!isAssignedTeacher) {
          // Also check tutor request approval
          const approvedRequest = await prisma.tutorRequest.findFirst({
            where: { studentId, teacherId: requestingUser.id, status: "approved" },
          });
          isAssignedTeacher = !!approvedRequest;
        }
      }

      if (!isOwnStudent && !isParent && !isAssignedTeacher) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const isTutorMode = await isTutorRequestModeEnabled();

      if (!isTutorMode) {
        // Direct assignment mode: look up from TeacherStudentAssignment
        const assignments = await storage.getAssignedTeachersForStudent(studentId);
        if (assignments.length === 0) {
          return res.json(null);
        }
        const teacher = await storage.getUserById(assignments[0].teacherId);
        return res.json(teacher ? { id: teacher.id, name: teacher.name, email: teacher.email } : null);
      } else {
        // Tutor request mode: find approved request for this student
        const allRequests = await prisma.tutorRequest.findMany({
          where: { studentId, status: "approved" },
          orderBy: { requestDate: "desc" },
          take: 1,
        });
        if (allRequests.length === 0) {
          return res.json(null);
        }
        const teacher = await storage.getUserById(allRequests[0].teacherId);
        return res.json(teacher ? { id: teacher.id, name: teacher.name, email: teacher.email } : null);
      }
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

  app.patch("/api/materials/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res
          .status(403)
          .json({ error: "Only teachers can update materials" });
      }

      // Check if material exists and belongs to the requesting teacher
      const existingMaterial = await storage.getMaterialById(
        parseInt(req.params.id),
      );
      if (!existingMaterial) {
        return res.status(404).json({ error: "Material not found" });
      }
      if (existingMaterial.teacherId !== user.id) {
        return res
          .status(403)
          .json({ error: "You can only update your own materials" });
      }

      // Validate update data (excludes immutable fields like teacherId and uploadDate)
      const validatedData = updateMaterialSchema.parse(req.body);

      const material = await storage.updateMaterial(
        parseInt(req.params.id),
        validatedData,
      );
      res.json(material);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/materials/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res
          .status(403)
          .json({ error: "Only teachers can delete materials" });
      }

      // Check if material exists and belongs to the requesting teacher
      const existingMaterial = await storage.getMaterialById(
        parseInt(req.params.id),
      );
      if (!existingMaterial) {
        return res.status(404).json({ error: "Material not found" });
      }
      if (existingMaterial.teacherId !== user.id) {
        return res
          .status(403)
          .json({ error: "You can only delete your own materials" });
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
      const schedules = await storage.getSchedulesByTeacher(
        req.session.userId!,
      );
      res.json(schedules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get(
    "/api/schedules/student/:studentId",
    requireAuth,
    async (req, res) => {
      try {
        const schedules = await storage.getSchedulesByStudent(
          parseInt(req.params.studentId),
        );
        res.json(schedules);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    },
  );

  app.patch("/api/schedules/:id", requireAuth, async (req, res) => {
    try {
      const schedule = await storage.updateSchedule(
        parseInt(req.params.id),
        req.body,
      );
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
        return res
          .status(403)
          .json({ error: "Only teachers can create sessions" });
      }

      const createSessionSchema = insertSessionSchema.omit({ teacherId: true });
      const data = createSessionSchema.parse(req.body);

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
      const studentId = parseInt(req.params.studentId);
      const isTutorRequestMode = await isTutorRequestModeEnabled();

      let sessions;
      if (isTutorRequestMode) {
        // When tutor request mode is ON, only show sessions the student is part of
        sessions = await storage.getSessionsByStudent(studentId);
      } else {
        // When tutor request mode is OFF, show ALL sessions
        sessions = await storage.getAllSessions();
      }

      // Add teacher name to each session
      const sessionsWithTeacher = await Promise.all(
        sessions.map(async (session) => {
          const teacher = await storage.getUserById(session.teacherId);
          return {
            ...session,
            teacherName: teacher?.name || null
          };
        })
      );

      res.json(sessionsWithTeacher);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sessions/:id", requireAuth, async (req, res) => {
    try {
      const session = await storage.getSessionById(parseInt(req.params.id));

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const user = await storage.getUserById(req.session.userId!);
      // Only teachers can view individual sessions, and only their own
      if (user?.role !== "teacher" || session.teacherId !== user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/sessions/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res
          .status(403)
          .json({ error: "Only teachers can update sessions" });
      }

      // Check if session exists and belongs to the requesting teacher
      const existingSession = await storage.getSessionById(
        parseInt(req.params.id),
      );
      if (!existingSession) {
        return res.status(404).json({ error: "Session not found" });
      }
      if (existingSession.teacherId !== user.id) {
        return res
          .status(403)
          .json({ error: "You can only update your own sessions" });
      }

      // Validate update data (excludes immutable fields like teacherId)
      const validatedData = updateSessionSchema.parse(req.body);

      const session = await storage.updateSession(
        parseInt(req.params.id),
        validatedData,
      );
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/sessions/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res
          .status(403)
          .json({ error: "Only teachers can delete sessions" });
      }

      // Check if session exists and belongs to the requesting teacher
      const existingSession = await storage.getSessionById(
        parseInt(req.params.id),
      );
      if (!existingSession) {
        return res.status(404).json({ error: "Session not found" });
      }
      if (existingSession.teacherId !== user.id) {
        return res
          .status(403)
          .json({ error: "You can only delete your own sessions" });
      }

      await storage.deleteSession(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== FEEDBACK ROUTES ==========

  app.post("/api/feedback", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res
          .status(403)
          .json({ error: "Only teachers can give feedback" });
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
      const feedback = await storage.getFeedbackByStudent(
        parseInt(req.params.studentId),
      );
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

  app.get(
    "/api/attendance/student/:studentId",
    requireAuth,
    async (req, res) => {
      try {
        const attendance = await storage.getAttendanceByStudent(
          parseInt(req.params.studentId),
        );
        res.json(attendance);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    },
  );

  app.patch("/api/attendance/:id", requireAuth, async (req, res) => {
    try {
      const attendance = await storage.updateAttendance(
        parseInt(req.params.id),
        req.body,
      );
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
        return res
          .status(403)
          .json({ error: "Only parents can make payments" });
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
      const payment = await storage.updatePayment(
        parseInt(req.params.id),
        req.body,
      );
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
        return res
          .status(403)
          .json({ error: "Only parents can request tutors" });
      }

      const data = insertTutorRequestSchema.parse({
        ...req.body,
        parentId: user.id,
        status: "pending",
        requestDate: new Date().toISOString(),
        responseDate: null,
      });

      // Validate that studentId (if provided) belongs to this parent
      if (data.studentId) {
        const student = await storage.getStudentById(data.studentId);
        if (!student || student.parentId !== user.id) {
          return res.status(403).json({ error: "Student does not belong to you" });
        }
      }

      let request = await storage.createTutorRequest(data);

      // When tutor-request mode is OFF, auto-approve immediately and link the teacher
      const isRequestMode = await isTutorRequestModeEnabled();
      if (!isRequestMode) {
        request = await storage.updateTutorRequest(request.id, {
          status: "approved",
          responseDate: new Date().toISOString(),
        });

        // Create or reactivate the TeacherStudentAssignment
        if (data.studentId) {
          const today = new Date().toISOString().split("T")[0];
          await prisma.teacherStudentAssignment.upsert({
            where: {
              teacherId_studentId: {
                teacherId: data.teacherId,
                studentId: data.studentId,
              },
            },
            create: {
              teacherId: data.teacherId,
              studentId: data.studentId,
              assignedDate: today,
              status: "active",
            },
            update: { status: "active", assignedDate: today },
          });
        }
      }

      res.json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tutor-requests/parent", requireAuth, async (req, res) => {
    try {
      const requests = await storage.getTutorRequestsByParent(
        req.session.userId!,
      );
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tutor-requests/teacher", requireAuth, async (req, res) => {
    try {
      const requests = await storage.getTutorRequestsByTeacher(
        req.session.userId!,
      );
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/tutor-requests/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res
          .status(403)
          .json({ error: "Only teachers can respond to requests" });
      }

      const { status } = req.body;
      const request = await storage.updateTutorRequest(
        parseInt(req.params.id),
        {
          status,
          responseDate: new Date().toISOString(),
        },
      );

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

  app.get("/api/messages/thread", requireAuth, async (req, res) => {
    try {
      const teacherId = parseInt(req.query.teacherId as string);
      const studentId = parseInt(req.query.studentId as string);
      if (!teacherId || !studentId) {
        return res.status(400).json({ error: "teacherId and studentId are required" });
      }

      // Authorization: requester must be the teacher, the student, or the student's parent
      const student = await storage.getStudentById(studentId);
      if (!student) return res.status(404).json({ error: "Student not found" });

      const requesterId = req.session.userId!;
      const isTeacher = requesterId === teacherId;
      const isStudent = requesterId === student.userId;
      const isParent = requesterId === student.parentId;

      if (!isTeacher && !isStudent && !isParent) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Validate that teacherId is actually assigned to this student
      const assignments = await storage.getAssignedTeachersForStudent(studentId);
      const isAssigned = assignments.some((a) => a.teacherId === teacherId);
      if (!isAssigned) {
        const approvedRequest = await prisma.tutorRequest.findFirst({
          where: { studentId, teacherId, status: "approved" },
        });
        if (!approvedRequest) {
          return res.status(403).json({ error: "Forbidden: teacher not assigned to this student" });
        }
      }

      const messages = await storage.getThreadMessages(teacherId, studentId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/messages/:userId", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getMessagesBetweenUsers(
        req.session.userId!,
        parseInt(req.params.userId),
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
        const otherId =
          msg.senderId === req.session.userId! ? msg.receiverId : msg.senderId;
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
        return res
          .status(403)
          .json({ error: "Only teachers can create reports" });
      }

      const body = req.body;
      // Map legacy form fields (reportDate/comments/overallGrade) to schema fields (date/content/grades)
      const overallNum = parseFloat(body.overallGrade);
      const grades = !isNaN(overallNum)
        ? { Overall: overallNum }
        : (typeof body.grades === "object" && body.grades) || {};

      const contentParts = [
        body.content || body.comments || "",
        body.strengths ? `Strengths: ${body.strengths}` : "",
        body.improvements ? `To improve: ${body.improvements}` : "",
      ].filter(Boolean);

      const data = insertProgressReportSchema.parse({
        studentId: body.studentId,
        teacherId: user.id,
        date: body.date || body.reportDate || new Date().toISOString().split("T")[0],
        period: body.period || body.reportDate || new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        content: contentParts.join("\n\n"),
        grades,
      });

      const report = await storage.createProgressReport(data);
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get(
    "/api/progress-reports/student/:studentId",
    requireAuth,
    async (req, res) => {
      try {
        const reports = await storage.getProgressReportsByStudent(
          parseInt(req.params.studentId),
        );
        res.json(reports);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    },
  );

  app.get("/api/progress-reports/teacher", requireAuth, async (req, res) => {
    try {
      const reports = await storage.getProgressReportsByTeacher(
        req.session.userId!,
      );
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/progress-reports/parent", requireAuth, async (req, res) => {
    try {
      const reports = await storage.getProgressReportsByParent(
        req.session.userId!,
      );
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
        return res
          .status(403)
          .json({ error: "Only students can request clarifications" });
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

  app.get(
    "/api/clarifications/student/:studentId",
    requireAuth,
    async (req, res) => {
      try {
        const clarifications = await storage.getClarificationsByStudent(
          parseInt(req.params.studentId),
        );
        res.json(clarifications);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    },
  );

  app.get(
    "/api/clarifications/assignment/:assignmentId",
    requireAuth,
    async (req, res) => {
      try {
        const clarifications = await storage.getClarificationsByAssignment(
          parseInt(req.params.assignmentId),
        );
        res.json(clarifications);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    },
  );

  app.patch("/api/clarifications/:id", requireAuth, async (req, res) => {
    try {
      const { answer } = req.body;
      const clarification = await storage.updateClarification(
        parseInt(req.params.id),
        {
          answer,
          answeredDate: new Date().toISOString(),
          status: "answered",
        },
      );
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

  app.get(
    "/api/parental-controls/student/:studentId",
    requireAuth,
    async (req, res) => {
      try {
        const control = await storage.getParentalControlByStudent(
          parseInt(req.params.studentId),
        );
        res.json(control);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    },
  );

  app.patch("/api/parental-controls/:id", requireAuth, async (req, res) => {
    try {
      const control = await storage.updateParentalControl(
        parseInt(req.params.id),
        req.body,
      );
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

  app.get(
    "/api/tutor-ratings/teacher/:teacherId",
    requireAuth,
    async (req, res) => {
      try {
        const ratings = await storage.getRatingsByTeacher(
          parseInt(req.params.teacherId),
        );
        res.json(ratings);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    },
  );

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
      const teachers = await storage.getAllTeachers();
      res.json(teachers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== SYSTEM SETTINGS ROUTES ==========

  // Public endpoint to check tutor request mode (no auth required for UI decisions)
  app.get("/api/system-settings/tutor-request-mode", async (req, res) => {
    try {
      const setting = await storage.getSystemSetting("TUTOR_REQUEST_MODE");
      // Default to false if not set (direct assignment mode)
      res.json({ enabled: setting?.value === "true" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/system-settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getAllSystemSettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/system-settings/:key", requireAuth, async (req, res) => {
    try {
      const setting = await storage.getSystemSetting(req.params.key);
      res.json(setting);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/system-settings", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "teacher") {
        return res
          .status(403)
          .json({ error: "Only teachers can modify system settings" });
      }

      const { key, value, description } = req.body;
      if (!key || !value) {
        return res.status(400).json({ error: "Key and value are required" });
      }

      const setting = await storage.setSystemSetting(key, value, description);
      res.json(setting);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Helper function to check if tutor request mode is enabled
  async function isTutorRequestModeEnabled(): Promise<boolean> {
    const setting = await storage.getSystemSetting("TUTOR_REQUEST_MODE");
    return setting?.value === "true";
  }

  // ========== DEV-ONLY: ROLE SWITCHER + SEED DATA ==========
  // Only active outside production — allows instant role switching for previewing all dashboards.
  if (process.env.NODE_ENV !== "production") {
    app.post("/api/dev/become", async (req, res) => {
      try {
        // Accept either { email } for a specific persona or legacy { role } for primary persona
        const { email: targetEmail, role: legacyRole } = req.body as { email?: string; role?: string };

        const today = new Date().toISOString().split("T")[0];
        const hash = await hashPassword("Demo1234!");

        // ── Ensure demo teachers ──
        let teacher = await storage.getUserByEmail("demo.teacher@lyraprep.dev");
        if (!teacher) {
          teacher = await storage.createUser({
            email: "demo.teacher@lyraprep.dev",
            password: hash,
            name: "Dr. Sarah Chen",
            role: "teacher",
            isEmailVerified: true,
            bio: "Experienced educator specialising in Mathematics, Physics, and SAT Prep. Passionate about making complex topics accessible.",
            teachingSubjects: ["Mathematics", "Physics", "SAT Prep"],
            yearsExperience: 9,
            qualifications: "M.Sc. Applied Mathematics, Certified SAT Tutor",
            specialization: "STEM & College Entrance Exams",
          });
        }

        let teacher2 = await storage.getUserByEmail("demo.teacher2@lyraprep.dev");
        if (!teacher2) {
          teacher2 = await storage.createUser({
            email: "demo.teacher2@lyraprep.dev",
            password: hash,
            name: "Mr. Marcus Johnson",
            role: "teacher",
            isEmailVerified: true,
            bio: "English Literature and History specialist with a talent for bringing texts and events to life. Experienced with middle and high school learners.",
            teachingSubjects: ["English", "History", "Essay Writing"],
            yearsExperience: 6,
            qualifications: "B.A. English Literature, PGCE Secondary Education",
            specialization: "Humanities & Creative Writing",
          });
        }

        let teacher3 = await storage.getUserByEmail("demo.teacher3@lyraprep.dev");
        if (!teacher3) {
          teacher3 = await storage.createUser({
            email: "demo.teacher3@lyraprep.dev",
            password: hash,
            name: "Ms. Aisha Patel",
            role: "teacher",
            isEmailVerified: true,
            bio: "Biology and Chemistry tutor focused on AP and IB level science. Loves helping students connect lab work to real-world applications.",
            teachingSubjects: ["Biology", "Chemistry", "AP Science"],
            yearsExperience: 11,
            qualifications: "Ph.D. Biochemistry, AP Certified Teacher",
            specialization: "Advanced Sciences & University Prep",
          });
        }

        // ── Ensure demo parent ──
        let parent = await storage.getUserByEmail("demo.parent@lyraprep.dev");
        if (!parent) {
          parent = await storage.createUser({
            email: "demo.parent@lyraprep.dev",
            password: hash,
            name: "James Wilson",
            role: "parent",
            isEmailVerified: true,
            phone: "+1 555-0192",
            preferredContact: "email",
          });
        }

        // ── Ensure demo students (all under James Wilson) ──
        // Student 1: Emily Wilson, Grade 10 — Sarah Chen's student
        let studentUser = await storage.getUserByEmail("demo.student@lyraprep.dev");
        if (!studentUser) {
          studentUser = await storage.createUser({
            email: "demo.student@lyraprep.dev",
            password: hash,
            name: "Emily Wilson",
            role: "student",
            isEmailVerified: true,
            favoriteSubject: "Mathematics",
            learningGoals: "Improve SAT score, master calculus, get into a top university",
            interests: ["Math Competitions", "Chess", "Piano"],
          });
        }
        let studentRecord = await storage.getStudentByUserId(studentUser.id);
        if (!studentRecord) {
          studentRecord = await storage.createStudent({
            userId: studentUser.id,
            parentId: parent.id,
            name: "Emily Wilson",
            gradeLevel: "Grade 10",
            badges: ["First Assignment", "Perfect Score", "5-Day Streak"],
            points: 840,
          });
        }

        // Student 2: Liam Wilson, Grade 7 — Marcus Johnson's student
        let studentUser2 = await storage.getUserByEmail("demo.student2@lyraprep.dev");
        if (!studentUser2) {
          studentUser2 = await storage.createUser({
            email: "demo.student2@lyraprep.dev",
            password: hash,
            name: "Liam Wilson",
            role: "student",
            isEmailVerified: true,
            favoriteSubject: "History",
            learningGoals: "Improve reading comprehension, write stronger essays, learn more about world history",
            interests: ["Football", "Video Games", "Reading"],
          });
        }
        let studentRecord2 = await storage.getStudentByUserId(studentUser2.id);
        if (!studentRecord2) {
          studentRecord2 = await storage.createStudent({
            userId: studentUser2.id,
            parentId: parent.id,
            name: "Liam Wilson",
            gradeLevel: "Grade 7",
            badges: ["First Assignment", "Bookworm"],
            points: 430,
          });
        }

        // Student 3: Sophie Wilson, Grade 12 — Aisha Patel's student
        let studentUser3 = await storage.getUserByEmail("demo.student3@lyraprep.dev");
        if (!studentUser3) {
          studentUser3 = await storage.createUser({
            email: "demo.student3@lyraprep.dev",
            password: hash,
            name: "Sophie Wilson",
            role: "student",
            isEmailVerified: true,
            favoriteSubject: "Biology",
            learningGoals: "Score 5 on AP Biology and AP Chemistry, apply to pre-med programs",
            interests: ["Science Olympiad", "Volunteering", "Running"],
          });
        }
        let studentRecord3 = await storage.getStudentByUserId(studentUser3.id);
        if (!studentRecord3) {
          studentRecord3 = await storage.createStudent({
            userId: studentUser3.id,
            parentId: parent.id,
            name: "Sophie Wilson",
            gradeLevel: "Grade 12",
            badges: ["First Assignment", "Perfect Score", "Top Performer", "Science Star"],
            points: 1250,
          });
        }

        // ── Seed rich test data (idempotent) ──
        const seeded = await storage.getSystemSetting("DEV_SEED_V2_DONE");
        if (!seeded) {
          // Assignments
          const a1 = await storage.createAssignment({
            title: "Quadratic Functions & Parabolas",
            description: "Complete exercises 3.1–3.8 on quadratic functions. Show all working. Include a graph for each function.",
            subject: "Mathematics",
            dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
            teacherId: teacher.id,
            gradeLevel: "Grade 10",
            points: 100,
            fileUrl: null,
          });
          const a2 = await storage.createAssignment({
            title: "Newton's Laws Problem Set",
            description: "Solve the 12 problems in the attached worksheet. Pay attention to units and significant figures.",
            subject: "Physics",
            dueDate: new Date(Date.now() + 8 * 86400000).toISOString().split("T")[0],
            teacherId: teacher.id,
            gradeLevel: "Grade 10",
            points: 120,
            fileUrl: null,
          });
          const a3 = await storage.createAssignment({
            title: "SAT Math Practice Test — Module 1",
            description: "Complete the full timed module (35 min). Submit your answer sheet and a reflection on which question types were hardest.",
            subject: "SAT Prep",
            dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
            teacherId: teacher.id,
            gradeLevel: "Grade 10",
            points: 80,
            fileUrl: null,
          });
          const a4 = await storage.createAssignment({
            title: "Trigonometry Ratios Quiz",
            description: "Short quiz covering sin, cos, tan, and their inverses. 20 questions, 30 minutes.",
            subject: "Mathematics",
            dueDate: new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0],
            teacherId: teacher.id,
            gradeLevel: "Grade 10",
            points: 50,
            fileUrl: null,
          });

          // Student assignments
          await storage.createStudentAssignment({
            assignmentId: a1.id,
            studentId: studentRecord.id,
            status: "pending",
            submission: null,
            fileUrl: null,
            notes: null,
            grade: null,
            feedback: null,
            submittedAt: null,
          });
          await storage.createStudentAssignment({
            assignmentId: a2.id,
            studentId: studentRecord.id,
            status: "submitted",
            submission: "I completed all 12 problems. Problem 7 required using Newton's 3rd law in a non-obvious way.",
            fileUrl: null,
            notes: "Submitted a bit late — please review",
            grade: null,
            feedback: null,
            submittedAt: new Date(Date.now() - 86400000).toISOString(),
          });
          await storage.createStudentAssignment({
            assignmentId: a3.id,
            studentId: studentRecord.id,
            status: "graded",
            submission: "Completed full module under timed conditions.",
            fileUrl: null,
            notes: null,
            grade: 72,
            feedback: "Good effort on the algebra section. Focus on word problems — you lost 6 points there. We will practice those next session.",
            submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          });
          await storage.createStudentAssignment({
            assignmentId: a4.id,
            studentId: studentRecord.id,
            status: "graded",
            submission: "Completed all 20 questions.",
            fileUrl: null,
            notes: null,
            grade: 92,
            feedback: "Excellent work! Strong grasp of inverse trig. Keep it up.",
            submittedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
          });

          // Materials
          await storage.createMaterial({
            title: "Quadratic Formula Cheat Sheet",
            description: "A concise reference card covering the quadratic formula, discriminant analysis, vertex form, and factoring strategies.",
            fileUrl: "https://example.com/materials/quadratic-cheatsheet.pdf",
            subject: "Mathematics",
            teacherId: teacher.id,
            uploadDate: new Date(Date.now() - 10 * 86400000).toISOString().split("T")[0],
            gradeLevel: "Grade 10",
          });
          await storage.createMaterial({
            title: "SAT Math Formulas & Strategies",
            description: "Official SAT formula sheet plus high-yield strategies for the math sections — includes annotated examples for each formula type.",
            fileUrl: "https://example.com/materials/sat-math-strategies.pdf",
            subject: "SAT Prep",
            teacherId: teacher.id,
            uploadDate: new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0],
            gradeLevel: "Grade 10",
          });
          await storage.createMaterial({
            title: "Newton's Laws — Illustrated Guide",
            description: "Visual walkthrough of all three Newtonian laws with real-world examples and practice problems at the end.",
            fileUrl: "https://example.com/materials/newtons-laws-guide.pdf",
            subject: "Physics",
            teacherId: teacher.id,
            uploadDate: new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0],
            gradeLevel: "Grade 10",
          });

          // Sessions (past + upcoming)
          const pastSession = await storage.createSession({
            teacher: { connect: { id: teacher.id } },
            studentIds: [studentRecord.id],
            subject: "Mathematics",
            sessionDate: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
            startTime: "14:00",
            endTime: "15:00",
            title: "Quadratic Equations — Deep Dive",
            description: "Reviewed completing the square and graphing parabolas. Emily showed great progress on vertex form.",
            meetingUrl: "https://meet.google.com/abc-demo-xyz",
            notes: "Emily needs more practice on word problems involving projectile motion.",
            status: "completed",
          });
          await storage.createSession({
            teacher: { connect: { id: teacher.id } },
            studentIds: [studentRecord.id],
            subject: "SAT Prep",
            sessionDate: new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0],
            startTime: "15:00",
            endTime: "16:30",
            title: "SAT Math — Word Problems Workshop",
            description: "We will drill the word problem types Emily found hardest in the practice module.",
            meetingUrl: "https://meet.google.com/abc-demo-xyz",
            notes: null,
            status: "scheduled",
          });

          // Tutor request (approved)
          const existingRequest = await prisma.tutorRequest.findFirst({
            where: { parentId: parent.id, teacherId: teacher.id },
          });
          if (!existingRequest) {
            await storage.createTutorRequest({
              parentId: parent.id,
              teacherId: teacher.id,
              studentId: studentRecord.id,
              status: "approved",
              message: "We are looking for a dedicated tutor to help Emily with Mathematics and SAT preparation. She is aiming for a 1500+ score.",
              requestDate: new Date(Date.now() - 20 * 86400000).toISOString().split("T")[0],
              responseDate: new Date(Date.now() - 18 * 86400000).toISOString().split("T")[0],
            });
          }

          // Teacher-student assignment (direct)
          const existingTSA = await storage.getTeacherStudentAssignment(teacher.id, studentRecord.id);
          if (!existingTSA) {
            await storage.createTeacherStudentAssignment({
              teacherId: teacher.id,
              studentId: studentRecord.id,
              assignedDate: today,
              status: "active",
            });
          }

          // Progress reports
          await storage.createProgressReport({
            studentId: studentRecord.id,
            teacherId: teacher.id,
            period: "March 2026",
            content: "Emily has shown consistent improvement across all subjects this month. Her mathematical reasoning is noticeably sharper, and she is tackling multi-step problems with more confidence. SAT prep is going well — her practice scores have risen from 1280 to 1360 over the past four weeks. Areas to watch: word problems and time management under exam conditions.",
            date: today,
            grades: { Mathematics: 88, Physics: 81, "SAT Prep": 85 },
          });
          await storage.createProgressReport({
            studentId: studentRecord.id,
            teacherId: teacher.id,
            period: "February 2026",
            content: "A solid month overall. Emily completed all assignments on time and actively participated in sessions. Mathematics remains her strongest subject. Physics requires more attention — she struggles with vector-based problems. Recommended additional practice problems from the resource pack.",
            date: "2026-02-28",
            grades: { Mathematics: 85, Physics: 74, "SAT Prep": 78 },
          });

          // Feedback
          await storage.createFeedback({
            teacherId: teacher.id,
            studentId: studentRecord.id,
            message: "Fantastic work on today's quiz — you nailed the inverse trig section! Keep building on this momentum.",
            date: new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0],
            type: "positive",
          });
          await storage.createFeedback({
            teacherId: teacher.id,
            studentId: studentRecord.id,
            message: "Word problems are your weakest area right now. Make sure to spend at least 20 minutes daily on the SAT word problem drills I sent — this will make a big difference before the exam.",
            date: new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0],
            type: "constructive",
          });

          // Attendance
          await storage.createAttendance({
            studentId: studentRecord.id,
            sessionId: pastSession.id,
            date: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
            status: "present",
            notes: null,
          });

          // ── Teacher 2 (Marcus Johnson) — Liam Wilson, Grade 7 ──
          const b1 = await storage.createAssignment({
            title: "The Diary of a Young Girl — Chapter Analysis",
            description: "Read chapters 1–5 of Anne Frank's diary. Write a 300-word analysis of how Anne's voice changes across these chapters.",
            subject: "English",
            dueDate: new Date(Date.now() + 6 * 86400000).toISOString().split("T")[0],
            teacherId: teacher2.id,
            gradeLevel: "Grade 7",
            points: 80,
            fileUrl: null,
          });
          const b2 = await storage.createAssignment({
            title: "World War II Timeline",
            description: "Create an illustrated timeline of key WW2 events from 1939–1945. Include at least 15 events with a 2-sentence explanation each.",
            subject: "History",
            dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
            teacherId: teacher2.id,
            gradeLevel: "Grade 7",
            points: 100,
            fileUrl: null,
          });
          const b3 = await storage.createAssignment({
            title: "Persuasive Essay — Homework Debate",
            description: "Write a 400-word persuasive essay arguing for OR against homework. Use at least 3 supporting points with evidence.",
            subject: "Essay Writing",
            dueDate: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
            teacherId: teacher2.id,
            gradeLevel: "Grade 7",
            points: 90,
            fileUrl: null,
          });

          await storage.createStudentAssignment({
            assignmentId: b1.id, studentId: studentRecord2.id,
            status: "pending", submission: null, fileUrl: null, notes: null, grade: null, feedback: null, submittedAt: null,
          });
          await storage.createStudentAssignment({
            assignmentId: b2.id, studentId: studentRecord2.id,
            status: "submitted",
            submission: "I created a 16-event timeline covering from the German invasion of Poland through the dropping of the atomic bombs.",
            fileUrl: null, notes: null, grade: null, feedback: null,
            submittedAt: new Date(Date.now() - 86400000).toISOString(),
          });
          await storage.createStudentAssignment({
            assignmentId: b3.id, studentId: studentRecord2.id,
            status: "graded",
            submission: "I argued against homework using three main points: stress, lack of play time, and diminishing returns after school hours.",
            fileUrl: null, notes: null,
            grade: 78,
            feedback: "Good argument structure, Liam! Your second point about play time was the strongest. Work on citing evidence more specifically next time.",
            submittedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          });

          await storage.createMaterial({
            title: "Essay Writing Framework",
            description: "A step-by-step guide to structuring persuasive and analytical essays — includes topic sentence, evidence, and conclusion templates.",
            fileUrl: "https://example.com/materials/essay-framework.pdf",
            subject: "Essay Writing",
            teacherId: teacher2.id,
            uploadDate: new Date(Date.now() - 8 * 86400000).toISOString().split("T")[0],
            gradeLevel: "Grade 7",
          });
          await storage.createMaterial({
            title: "WW2 Key Figures Reference Sheet",
            description: "Quick-reference cards for major figures of WWII — leaders, generals, and civilians who shaped the war's outcome.",
            fileUrl: "https://example.com/materials/ww2-figures.pdf",
            subject: "History",
            teacherId: teacher2.id,
            uploadDate: new Date(Date.now() - 12 * 86400000).toISOString().split("T")[0],
            gradeLevel: "Grade 7",
          });

          const pastSession2 = await storage.createSession({
            teacher: { connect: { id: teacher2.id } },
            studentIds: [studentRecord2.id],
            subject: "English",
            sessionDate: new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0],
            startTime: "16:00", endTime: "17:00",
            title: "Reading Comprehension Strategies",
            description: "Worked through active reading techniques — annotation, summarising, and identifying author's intent.",
            meetingUrl: "https://meet.google.com/def-demo-lmn",
            notes: "Liam is engaged but needs to slow down when annotating. Recommend re-reading each paragraph before moving on.",
            status: "completed",
          });
          await storage.createSession({
            teacher: { connect: { id: teacher2.id } },
            studentIds: [studentRecord2.id],
            subject: "History",
            sessionDate: new Date(Date.now() + 6 * 86400000).toISOString().split("T")[0],
            startTime: "16:00", endTime: "17:00",
            title: "WW2 Causes — Interactive Discussion",
            description: "Deep dive into the political and economic causes of WWII ahead of the timeline assignment.",
            meetingUrl: "https://meet.google.com/def-demo-lmn",
            notes: null, status: "scheduled",
          });

          const existingReq2 = await prisma.tutorRequest.findFirst({ where: { parentId: parent.id, teacherId: teacher2.id } });
          if (!existingReq2) {
            await storage.createTutorRequest({
              parentId: parent.id, teacherId: teacher2.id, studentId: studentRecord2.id,
              status: "approved",
              message: "Liam struggles with writing and needs help with comprehension. He loves history so we hope that helps as an entry point.",
              requestDate: new Date(Date.now() - 25 * 86400000).toISOString().split("T")[0],
              responseDate: new Date(Date.now() - 23 * 86400000).toISOString().split("T")[0],
            });
          }
          const existingTSA2 = await storage.getTeacherStudentAssignment(teacher2.id, studentRecord2.id);
          if (!existingTSA2) {
            await storage.createTeacherStudentAssignment({ teacherId: teacher2.id, studentId: studentRecord2.id, assignedDate: today, status: "active" });
          }

          await storage.createProgressReport({
            studentId: studentRecord2.id, teacherId: teacher2.id,
            period: "March 2026",
            content: "Liam is showing real enthusiasm for History — his timeline work is detailed and thoughtful. Writing remains the primary growth area: sentence variety and evidence citation need work. We are making steady progress with the essay framework. He consistently attends sessions and asks good questions.",
            date: today,
            grades: { English: 74, History: 82, "Essay Writing": 71 },
          });
          await storage.createProgressReport({
            studentId: studentRecord2.id, teacherId: teacher2.id,
            period: "February 2026",
            content: "A promising start. Liam is confident in History but tentative with written work. Introduced the essay framework; early signs are positive. Recommended daily reading of at least 20 minutes to build vocabulary and comprehension.",
            date: "2026-02-28",
            grades: { English: 68, History: 79, "Essay Writing": 65 },
          });

          await storage.createFeedback({ teacherId: teacher2.id, studentId: studentRecord2.id, message: "Your WW2 submission was thorough and well-organised — I was impressed with the level of detail!", date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0], type: "positive" });
          await storage.createFeedback({ teacherId: teacher2.id, studentId: studentRecord2.id, message: "For your next essay, try to include a quote or statistic for each point — it will make your arguments much more convincing.", date: new Date(Date.now() - 4 * 86400000).toISOString().split("T")[0], type: "constructive" });
          await storage.createAttendance({ studentId: studentRecord2.id, sessionId: pastSession2.id, date: new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0], status: "present", notes: null });

          // ── Teacher 3 (Aisha Patel) — Sophie Wilson, Grade 12 ──
          const c1 = await storage.createAssignment({
            title: "AP Biology — Cellular Respiration Lab Report",
            description: "Write a full lab report for the fermentation experiment we ran in our last session. Include hypothesis, method, data, analysis, and conclusion (800–1000 words).",
            subject: "Biology",
            dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
            teacherId: teacher3.id,
            gradeLevel: "Grade 12",
            points: 150,
            fileUrl: null,
          });
          const c2 = await storage.createAssignment({
            title: "AP Chemistry — Equilibrium Problem Set",
            description: "Complete all 20 equilibrium problems. Show equilibrium expressions, ICE tables where applicable, and calculations. Due at start of our next session.",
            subject: "Chemistry",
            dueDate: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
            teacherId: teacher3.id,
            gradeLevel: "Grade 12",
            points: 120,
            fileUrl: null,
          });
          const c3 = await storage.createAssignment({
            title: "AP Biology Practice MCQ — Genetics Unit",
            description: "Complete the 40-question genetics MCQ under timed conditions (50 min). Justify your answers for any you were unsure about.",
            subject: "AP Science",
            dueDate: new Date(Date.now() - 1 * 86400000).toISOString().split("T")[0],
            teacherId: teacher3.id,
            gradeLevel: "Grade 12",
            points: 100,
            fileUrl: null,
          });

          await storage.createStudentAssignment({
            assignmentId: c1.id, studentId: studentRecord3.id,
            status: "submitted",
            submission: "Lab report attached. The yeast showed higher respiration rates at 37°C than at 25°C or 15°C, consistent with enzyme optimal temperature theory.",
            fileUrl: null, notes: "Happy to revise if needed!", grade: null, feedback: null,
            submittedAt: new Date(Date.now() - 86400000).toISOString(),
          });
          await storage.createStudentAssignment({
            assignmentId: c2.id, studentId: studentRecord3.id,
            status: "pending", submission: null, fileUrl: null, notes: null, grade: null, feedback: null, submittedAt: null,
          });
          await storage.createStudentAssignment({
            assignmentId: c3.id, studentId: studentRecord3.id,
            status: "graded",
            submission: "Completed all 40 questions under 50 minutes. Was unsure about Mendel's law questions at the end.",
            fileUrl: null, notes: null,
            grade: 93,
            feedback: "Outstanding, Sophie — 37/40 is a 5-level score! Review questions 28 and 35 on linked genes. You are well on track for the AP exam.",
            submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          });

          await storage.createMaterial({
            title: "AP Biology — Genetics Quick Reference",
            description: "Covers Mendelian genetics, linked genes, codominance, and non-disjunction with worked examples and AP-style questions.",
            fileUrl: "https://example.com/materials/ap-bio-genetics.pdf",
            subject: "Biology",
            teacherId: teacher3.id,
            uploadDate: new Date(Date.now() - 9 * 86400000).toISOString().split("T")[0],
            gradeLevel: "Grade 12",
          });
          await storage.createMaterial({
            title: "AP Chemistry — Equilibrium & Ksp Master Sheet",
            description: "Complete coverage of chemical equilibrium, Le Chatelier's principle, Ksp calculations, and common exam question patterns.",
            fileUrl: "https://example.com/materials/ap-chem-equilibrium.pdf",
            subject: "Chemistry",
            teacherId: teacher3.id,
            uploadDate: new Date(Date.now() - 11 * 86400000).toISOString().split("T")[0],
            gradeLevel: "Grade 12",
          });

          const pastSession3 = await storage.createSession({
            teacher: { connect: { id: teacher3.id } },
            studentIds: [studentRecord3.id],
            subject: "Biology",
            sessionDate: new Date(Date.now() - 4 * 86400000).toISOString().split("T")[0],
            startTime: "17:00", endTime: "18:30",
            title: "Genetics Unit — Linked Genes Deep Dive",
            description: "Worked through complex linked-gene problems and non-disjunction scenarios. Sophie grasped the concept quickly once we drew chromosome diagrams.",
            meetingUrl: "https://meet.google.com/ghi-demo-opq",
            notes: "Review questions 28 and 35 from the MCQ for next session.",
            status: "completed",
          });
          await storage.createSession({
            teacher: { connect: { id: teacher3.id } },
            studentIds: [studentRecord3.id],
            subject: "Chemistry",
            sessionDate: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
            startTime: "17:00", endTime: "18:30",
            title: "Equilibrium Problem Workshop",
            description: "Go through the problem set together, focusing on multi-step ICE table problems which are high-frequency on the AP exam.",
            meetingUrl: "https://meet.google.com/ghi-demo-opq",
            notes: null, status: "scheduled",
          });

          const existingReq3 = await prisma.tutorRequest.findFirst({ where: { parentId: parent.id, teacherId: teacher3.id } });
          if (!existingReq3) {
            await storage.createTutorRequest({
              parentId: parent.id, teacherId: teacher3.id, studentId: studentRecord3.id,
              status: "approved",
              message: "Sophie is targeting top AP scores in Biology and Chemistry and needs a specialist tutor. She is very motivated and self-directed.",
              requestDate: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
              responseDate: new Date(Date.now() - 28 * 86400000).toISOString().split("T")[0],
            });
          }
          const existingTSA3 = await storage.getTeacherStudentAssignment(teacher3.id, studentRecord3.id);
          if (!existingTSA3) {
            await storage.createTeacherStudentAssignment({ teacherId: teacher3.id, studentId: studentRecord3.id, assignedDate: today, status: "active" });
          }

          await storage.createProgressReport({
            studentId: studentRecord3.id, teacherId: teacher3.id,
            period: "March 2026",
            content: "Sophie is performing at an exceptional level. Her genetics MCQ score of 93% puts her firmly in AP 5 territory. Lab reports are thorough and well-written. The remaining gap is equilibrium chemistry — she sometimes skips ICE table steps under time pressure. Addressing this in our next session.",
            date: today,
            grades: { Biology: 95, Chemistry: 88, "AP Science": 93 },
          });
          await storage.createProgressReport({
            studentId: studentRecord3.id, teacherId: teacher3.id,
            period: "February 2026",
            content: "An outstanding student who comes prepared and asks precise questions. February scores show strong growth in both subjects. Identified chemical equilibrium as the only area requiring more attention. Sophie took on extra practice problems without being asked — excellent attitude.",
            date: "2026-02-28",
            grades: { Biology: 91, Chemistry: 82, "AP Science": 88 },
          });

          await storage.createFeedback({ teacherId: teacher3.id, studentId: studentRecord3.id, message: "37/40 on the genetics MCQ is exceptional work — you are absolutely ready for AP exam level questions.", date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0], type: "positive" });
          await storage.createFeedback({ teacherId: teacher3.id, studentId: studentRecord3.id, message: "Always show your ICE table working even when it feels obvious — AP graders award method marks and you don't want to lose them.", date: new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0], type: "constructive" });
          await storage.createAttendance({ studentId: studentRecord3.id, sessionId: pastSession3.id, date: new Date(Date.now() - 4 * 86400000).toISOString().split("T")[0], status: "present", notes: null });

          // Mark seed done (v2)
          await storage.setSystemSetting("DEV_SEED_V2_DONE", "true", "Demo seed data v2 — 3 teachers, 3 students under one parent");
        }

        // ── Resolve the target user ──
        const DEMO_EMAILS: Record<string, string> = {
          teacher:  "demo.teacher@lyraprep.dev",
          teacher2: "demo.teacher2@lyraprep.dev",
          teacher3: "demo.teacher3@lyraprep.dev",
          parent:   "demo.parent@lyraprep.dev",
          student:  "demo.student@lyraprep.dev",
          student2: "demo.student2@lyraprep.dev",
          student3: "demo.student3@lyraprep.dev",
        };

        const resolvedEmail = targetEmail ?? (legacyRole ? DEMO_EMAILS[legacyRole] : null);
        if (!resolvedEmail) return res.status(400).json({ error: "Provide email or role" });

        const targetUser = await storage.getUserByEmail(resolvedEmail);
        if (!targetUser) return res.status(404).json({ error: "Demo user not found" });

        const newSessionId = crypto.randomUUID();
        sessions.set(newSessionId, targetUser.id);
        const studentProfile = targetUser.role === "student" ? await storage.getStudentByUserId(targetUser.id) : null;

        return res.json({
          sessionId: newSessionId,
          user: {
            id: targetUser.id,
            email: targetUser.email,
            name: targetUser.name,
            role: targetUser.role,
            isEmailVerified: targetUser.isEmailVerified,
            profilePicture: targetUser.profilePicture,
            bio: targetUser.bio,
            teachingSubjects: targetUser.teachingSubjects,
            yearsExperience: targetUser.yearsExperience,
            qualifications: targetUser.qualifications,
            specialization: targetUser.specialization,
            phone: targetUser.phone,
            preferredContact: targetUser.preferredContact,
            interests: targetUser.interests,
            favoriteSubject: targetUser.favoriteSubject,
            learningGoals: targetUser.learningGoals,
          },
          student: studentProfile ?? null,
        });
      } catch (error: any) {
        console.error("Dev become error:", error);
        res.status(500).json({ error: error.message });
      }
    });
  }
}
