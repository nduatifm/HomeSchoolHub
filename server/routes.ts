import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import prisma from "./db";
import { Prisma } from "@prisma/client";
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
  studentGoogleSignupSchema,
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

// Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// DB-backed session helpers
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function createSession(userId: number): Promise<string> {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.authSession.create({ data: { id, userId, expiresAt } });
  return id;
}

async function getSessionUserId(sessionId: string): Promise<number | null> {
  const session = await prisma.authSession.findUnique({ where: { id: sessionId } });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.authSession.deleteMany({ where: { id: sessionId } });
    return null;
  }
  return session.userId;
}

async function deleteSession(sessionId: string): Promise<void> {
  await prisma.authSession.deleteMany({ where: { id: sessionId } });
}

// Generate 6-character uppercase alphanumeric invite code
function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// Shared session extraction helper — resolves Bearer token → userId and populates req.session.
// Returns the userId on success, or sends an error response and returns null.
async function resolveSessionUserId(req: Request, res: Response): Promise<number | null> {
  const sessionId = req.headers.authorization?.replace("Bearer ", "");
  if (!sessionId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const userId = await getSessionUserId(sessionId);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  req.session = { userId };
  return userId;
}

// Auth middleware
async function requireAuth(req: Request, res: Response, next: Function) {
  try {
    const userId = await resolveSessionUserId(req, res);
    if (userId === null) return;
    next();
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
}

// Admin middleware — composes requireAuth then checks admin flag
async function requireAdmin(req: Request, res: Response, next: Function) {
  await requireAuth(req, res, async () => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user || (!user.isAdmin && !user.isSuperAdmin)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

// Super admin middleware — composes requireAuth then checks super-admin flag
async function requireSuperAdmin(req: Request, res: Response, next: Function) {
  await requireAuth(req, res, async () => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user || !user.isSuperAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

// Sync SUPER_ADMIN_EMAIL and ADMIN_EMAIL env vars to DB flags on startup.
// Enforces exact desired state: promotes target users and demotes previous ones.
async function syncAdminFlags() {
  try {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim() || null;
    const adminEmail = process.env.ADMIN_EMAIL?.trim() || null;

    const allUsers = await storage.getAllUsers();

    for (const u of allUsers) {
      const shouldBeSuperAdmin = !!superAdminEmail && u.email === superAdminEmail;
      const shouldBeAdmin = shouldBeSuperAdmin || (!!adminEmail && u.email === adminEmail);

      const currentIsAdmin = u.isAdmin ?? false;
      const currentIsSuperAdmin = u.isSuperAdmin ?? false;

      if (currentIsAdmin !== shouldBeAdmin || currentIsSuperAdmin !== shouldBeSuperAdmin) {
        await storage.updateUser(u.id, {
          isAdmin: shouldBeAdmin,
          isSuperAdmin: shouldBeSuperAdmin,
        } as Prisma.UserUpdateInput);
        console.log(`[admin] Synced ${u.email}: isAdmin=${shouldBeAdmin}, isSuperAdmin=${shouldBeSuperAdmin}`);
      }
    }
  } catch (err) {
    console.error("[admin] syncAdminFlags error:", err);
  }
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
  // Sync admin flags from env vars on startup
  syncAdminFlags();

  // Delete expired sessions on startup
  prisma.authSession.deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .then((r) => { if (r.count > 0) console.log(`[sessions] Deleted ${r.count} expired sessions`); })
    .catch((err) => console.error("[sessions] Failed to clean expired sessions:", err));

  // Ensure TUTOR_REQUEST_MODE is ON by default (requests require teacher approval)
  storage.getSystemSetting("TUTOR_REQUEST_MODE").then(async (s) => {
    if (!s) {
      await storage.setSystemSetting("TUTOR_REQUEST_MODE", "true", "Requires teacher to approve/reject parent tutor requests (set false to auto-approve)");
      console.log("[settings] TUTOR_REQUEST_MODE defaulted to true");
    }
  }).catch((err) => console.error("[settings] Failed to init TUTOR_REQUEST_MODE:", err));

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
        roles: [role],
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

      const sessionId = await createSession(user.id);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          roles: user.roles ?? [],
        },
        sessionId,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Student signup via invite (password)
  app.post("/api/auth/signup/student", async (req, res) => {
    try {
      // Validate input with Zod
      const validation = studentSignupSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: validation.error.errors[0].message,
        });
      }

      const { code, password } = validation.data;

      const invite = await storage.getStudentInviteByCode(code.toUpperCase());
      if (!invite || invite.status === "accepted") {
        return res.status(400).json({ error: "Invalid or expired invite code" });
      }

      // Check if invite is expired
      if (new Date(invite.expiresDate) < new Date()) {
        return res.status(400).json({ error: "Invite has expired" });
      }

      // Check if email is already registered
      const existingUser = await storage.getUserByEmail(invite.email);
      if (existingUser) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }

      // Create user account - mark as verified since invite code IS the verification
      const hashedPassword = await hashPassword(password);

      const user = await storage.createUser({
        email: invite.email,
        password: hashedPassword,
        name: invite.studentName,
        role: "student",
        roles: ["student"],
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
        // Select a teacher by load-balancing approved TutorRequest counts, then create
        // only an approved TutorRequest (single source of truth — no TSA write).
        const teacherId = await storage.findFirstAvailableTeacherId(student.id);
        if (teacherId !== null) {
          const today = new Date().toISOString().split("T")[0];
          await storage.createTutorRequest({
            parentId: invite.parentId,
            teacherId,
            studentId: student.id,
            status: "approved",
            message: "Auto-assigned on student signup",
            requestDate: today,
            responseDate: today,
          });
        }
      }

      // Mark invite as accepted
      await storage.updateStudentInvite(invite.id, { status: "accepted" });

      // Create session immediately - student verified via invite code
      const sessionId = await createSession(user.id);

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

  // Student signup via invite (Google)
  app.post("/api/auth/signup/student/google", async (req, res) => {
    try {
      const validation = studentGoogleSignupSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: validation.error.errors[0].message,
        });
      }

      const { code, credential } = validation.data;

      const invite = await storage.getStudentInviteByCode(code.toUpperCase());
      if (!invite || invite.status === "accepted") {
        return res.status(400).json({ error: "Invalid or expired invite code" });
      }

      if (new Date(invite.expiresDate) < new Date()) {
        return res.status(400).json({ error: "Invite has expired" });
      }

      // Verify the Google token
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return res.status(401).json({ error: "Invalid Google token" });
      }

      const googleId = payload.sub;
      const googleEmail = payload.email;
      const profilePicture = payload.picture;

      // Require the Google account email to match the invited student's email
      if (!googleEmail || googleEmail.toLowerCase() !== invite.email.toLowerCase()) {
        return res.status(400).json({
          error: "The Google account email must match the invited student email (" + invite.email + ")",
        });
      }

      // Require the Google account email to be verified by Google
      if (!payload.email_verified) {
        return res.status(400).json({ error: "Google account email is not verified" });
      }

      // Check if email is already registered
      const existingUser = await storage.getUserByEmail(invite.email);
      if (existingUser) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }

      // Create user account linked to Google
      const user = await storage.createUser({
        email: invite.email,
        password: null,
        name: invite.studentName,
        role: "student",
        roles: ["student"],
        isEmailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
        googleId,
        profilePicture: profilePicture || null,
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

      // Auto-assign to teacher if not in tutor request mode
      const tutorRequestModeSetting =
        await storage.getSystemSetting("TUTOR_REQUEST_MODE");
      const isTutorRequestMode = tutorRequestModeSetting?.value === "true";

      if (!isTutorRequestMode) {
        // Select a teacher by load-balancing approved TutorRequest counts, then create
        // only an approved TutorRequest (single source of truth — no TSA write).
        const teacherId = await storage.findFirstAvailableTeacherId(student.id);
        if (teacherId !== null) {
          const today = new Date().toISOString().split("T")[0];
          await storage.createTutorRequest({
            parentId: invite.parentId,
            teacherId,
            studentId: student.id,
            status: "approved",
            message: "Auto-assigned on student signup",
            requestDate: today,
            responseDate: today,
          });
        }
      }

      // Mark invite as accepted
      await storage.updateStudentInvite(invite.id, { status: "accepted" });

      // Create session
      const sessionId = await createSession(user.id);

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
      console.error("Student Google signup error:", error);
      res.status(500).json({ error: "Failed to authenticate with Google" });
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
          roles: [role],
          isEmailVerified: true, // Google already verified email
          emailVerifyToken: null,
          emailVerifyExpires: null,
          googleId,
          profilePicture,
        });
      }

      // Create session
      const sessionId = await createSession(user.id);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          roles: user.roles ?? [],
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

      // Ensure roles array is valid: if empty or missing current role, rebuild it
      let roles = user.roles ?? [];
      if (user.role && !roles.includes(user.role)) {
        roles = [...new Set([...roles, user.role])];
        // Update in database
        await prisma.user.update({
          where: { id: user.id },
          data: { roles },
        });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          roles: roles,
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
          isAdmin: user.isAdmin ?? false,
          isSuperAdmin: user.isSuperAdmin ?? false,
        },
        profile,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Logout
  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    const sessionId = req.headers.authorization?.replace("Bearer ", "");
    if (sessionId) {
      await deleteSession(sessionId);
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
      const userId = req.session.userId!;

      // Atomically update User.name and Student.name (if a student record exists)
      const [user] = await prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({ where: { id: userId }, data: { name } });
        await tx.student.updateMany({ where: { userId }, data: { name } });
        return [updatedUser];
      });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          roles: user.roles ?? [],
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
          roles: user.roles ?? [],
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
          roles: user.roles ?? [],
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

  // Add a new role to the user's capabilities (e.g. parent adding teacher role)
  app.post("/api/user/add-role", requireAuth, async (req, res) => {
    try {
      const { role: newRole } = z.object({ role: z.enum(["teacher"]) }).parse(req.body);
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Only parents can add the teacher role
      const currentRoles: string[] = user.roles ?? [];
      if (!currentRoles.includes("parent")) {
        return res.status(403).json({ error: "Only parents can add the teacher role" });
      }

      if (currentRoles.includes(newRole)) {
        return res.status(400).json({ error: `You already have the ${newRole} role` });
      }

      // Append new role to roles[] and switch active context to new role
      const updatedRoles = [...currentRoles, newRole];
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { roles: updatedRoles, role: newRole },
      });

      res.json({
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          roles: updatedUser.roles,
          profilePicture: updatedUser.profilePicture,
          isEmailVerified: updatedUser.isEmailVerified,
          googleId: updatedUser.googleId,
          bio: updatedUser.bio,
          teachingSubjects: updatedUser.teachingSubjects,
          yearsExperience: updatedUser.yearsExperience,
          qualifications: updatedUser.qualifications,
          specialization: updatedUser.specialization,
          phone: updatedUser.phone,
          preferredContact: updatedUser.preferredContact,
          interests: updatedUser.interests,
          favoriteSubject: updatedUser.favoriteSubject,
          learningGoals: updatedUser.learningGoals,
          isAdmin: updatedUser.isAdmin ?? false,
          isSuperAdmin: updatedUser.isSuperAdmin ?? false,
        },
      });
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ error: error.errors[0].message });
      res.status(500).json({ error: error.message });
    }
  });

  // Switch active role context (for dual-role users)
  app.post("/api/user/switch-active-role", requireAuth, async (req, res) => {
    try {
      const { role: targetRole } = z.object({ role: z.string().min(1) }).parse(req.body);
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(404).json({ error: "User not found" });

      let currentRoles: string[] = user.roles ?? [];
      // Ensure current role is always in the roles array
      if (!currentRoles.includes(user.role ?? "")) {
        currentRoles = [...new Set([...currentRoles, user.role ?? ""])];
      }
      
      if (!currentRoles.includes(targetRole)) {
        return res.status(400).json({ error: `You do not have the ${targetRole} role` });
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { role: targetRole, roles: currentRoles },
      });

      res.json({
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          roles: updatedUser.roles,
          profilePicture: updatedUser.profilePicture,
          isEmailVerified: updatedUser.isEmailVerified,
          googleId: updatedUser.googleId,
          bio: updatedUser.bio,
          teachingSubjects: updatedUser.teachingSubjects,
          yearsExperience: updatedUser.yearsExperience,
          qualifications: updatedUser.qualifications,
          specialization: updatedUser.specialization,
          phone: updatedUser.phone,
          preferredContact: updatedUser.preferredContact,
          interests: updatedUser.interests,
          favoriteSubject: updatedUser.favoriteSubject,
          learningGoals: updatedUser.learningGoals,
          isAdmin: updatedUser.isAdmin ?? false,
          isSuperAdmin: updatedUser.isSuperAdmin ?? false,
        },
      });
    } catch (error: any) {
      if (error.name === "ZodError") return res.status(400).json({ error: error.errors[0].message });
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
      // Generate a unique invite code with collision retry
      let code = generateInviteCode();
      for (let attempt = 0; attempt < 10; attempt++) {
        const existing = await storage.getStudentInviteByCode(code);
        if (!existing) break;
        code = generateInviteCode();
      }
      const expiresDate = new Date();
      expiresDate.setDate(expiresDate.getDate() + 7); // 7 days expiry

      const invite = await storage.createStudentInvite({
        email: data.email,
        studentName: data.studentName,
        gradeLevel: data.gradeLevel,
        parent: { connect: { id: user.id } },
        token,
        code,
        status: "pending",
        createdDate: new Date().toISOString(),
        expiresDate: expiresDate.toISOString(),
      });

      // Send invite email with short code and link to /student-signup (non-blocking)
      sendStudentInviteEmail(
        data.email,
        data.studentName,
        code,
        user.name,
      ).catch((err) =>
        console.error("Failed to send student invite email:", err),
      );

      // Strip token from response — token is internal only
      const { token: _tok, ...safeInvite } = invite;
      res.json(safeInvite);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/invites/student/parent", requireAuth, async (req, res) => {
    try {
      const invites = await storage.getStudentInvitesByParent(
        req.session.userId!,
      );
      // Strip token from all invite records — token is internal only
      const safeInvites = invites.map(({ token: _tok, ...rest }) => rest);
      res.json(safeInvites);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/invites/student/code/:code", async (req, res) => {
    try {
      const invite = await storage.getStudentInviteByCode(req.params.code.toUpperCase());
      if (!invite || invite.status === "accepted") {
        return res.status(404).json({ error: "Invite not found or already used" });
      }
      if (new Date(invite.expiresDate) < new Date()) {
        return res.status(400).json({ error: "Invite has expired" });
      }
      // Return only safe fields (no token)
      res.json({
        studentName: invite.studentName,
        gradeLevel: invite.gradeLevel,
        email: invite.email,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/invites/student/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role !== "parent") {
        return res.status(403).json({ error: "Only parents can revoke invites" });
      }
      const inviteId = parseInt(req.params.id, 10);
      if (isNaN(inviteId)) {
        return res.status(400).json({ error: "Invalid invite id" });
      }
      const invites = await storage.getStudentInvitesByParent(user.id);
      const invite = invites.find((i) => i.id === inviteId);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      await storage.deleteStudentInviteById(inviteId);
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

  // GET /api/students/search?q= — platform-wide student search by name or email (teacher only)
  app.get("/api/students/search", requireAuth, async (req, res) => {
    try {
      // Only teachers (and admins) may access this endpoint.
      // Check both role (active context) and roles array for compatibility with all account types.
      const caller = await storage.getUserById(req.session.userId!);
      const isTeacher = caller?.role === "teacher" || caller?.roles?.includes("teacher");
      if (!caller || (!isTeacher && !caller.isAdmin && !caller.isSuperAdmin)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const q = String(req.query.q ?? "").trim();
      // Require at least 2 characters to prevent broad directory dumps
      if (q.length < 2) return res.json([]);
      const students = await prisma.student.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { user: { username: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        },
        select: {
          id: true,
          name: true,
          gradeLevel: true,
          user: { select: { email: true } },
        },
        take: 30,
        orderBy: { name: "asc" },
      });
      res.json(students.map((s) => ({ id: s.id, name: s.name, gradeLevel: s.gradeLevel, email: s.user.email })));
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
        // Notify the student
        if (student.userId) {
          storage.createNotification({
            userId: student.userId,
            type: "new_assignment",
            title: "New Assignment",
            body: `You have a new assignment: "${assignment.title}"`,
            link: "/dashboard#classrooms",
          }).catch(console.error);
        }
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
          // When tutor request mode is OFF, show assignments from approved tutors.
          // Approved TutorRequest is the single authoritative teacher-student link.
          const student = await storage.getStudentById(studentId);
          const allAssignments = await storage.getAllAssignments();

          // Get teachers linked to this student via approved TutorRequest
          const approvedRequests = await prisma.tutorRequest.findMany({
            where: { studentId, status: "approved" },
            select: { teacherId: true },
          });
          const assignedTeacherIds = new Set(approvedRequests.map((r) => r.teacherId));

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

        // Find an associated classroom for deep-linking: look for a classroom owned by
        // this teacher where the student is enrolled and there is a matching assignment title.
        // Falls back to generic dashboard links when no classroom association exists.
        const linkedEnrollment = student && assignment
          ? await prisma.classroomEnrollment.findFirst({
              where: {
                studentId: student.id,
                classroom: {
                  teacherId: assignment.teacherId,
                  assignments: { some: { title: assignment.title } },
                },
              },
              select: { classroomId: true },
            })
          : null;
        const studentGradeLink = linkedEnrollment
          ? `/classrooms/${linkedEnrollment.classroomId}`
          : "/dashboard#classrooms";
        const parentGradeLink = linkedEnrollment
          ? `/classrooms/${linkedEnrollment.classroomId}`
          : "/dashboard#children";

        // Notify the student their work was graded
        if (student?.userId) {
          storage.createNotification({
            userId: student.userId,
            type: "assignment_graded",
            title: "Assignment Graded",
            body: `Your assignment "${assignment?.title ?? "submission"}" has been graded: ${grade}%`,
            link: studentGradeLink,
          }).catch(console.error);
        }

        // Also notify the parent when a child's assignment is graded
        if (student?.parentId) {
          storage.createNotification({
            userId: student.parentId,
            type: "assignment_graded",
            title: "Assignment Graded",
            body: `${student.name}'s assignment "${assignment?.title ?? "submission"}" was graded: ${grade}%`,
            link: parentGradeLink,
          }).catch(console.error);
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

      const isTutorMode = await isTutorRequestModeEnabled();

      let isAssignedTeacher = false;
      if (requestingUser.role === "teacher") {
        if (!isTutorMode) {
          // In direct-assignment mode, any teacher can look up any student's teacher
          isAssignedTeacher = true;
        } else {
          // In tutor-request mode, approved TutorRequest is the single source of truth
          const approvedRequest = await prisma.tutorRequest.findFirst({
            where: { teacherId: requestingUser.id, status: "approved", studentId },
          });
          isAssignedTeacher = !!approvedRequest;
        }
      }

      if (!isOwnStudent && !isParent && !isAssignedTeacher) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Approved TutorRequest is the single authoritative source for both modes.
      // In direct-assignment mode a request is auto-approved, so it exists here too.
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

      // Guard: cannot request yourself as a tutor
      if (data.teacherId === user.id) {
        return res.status(400).json({ error: "You cannot request yourself as a tutor" });
      }

      // Validate that studentId (if provided) belongs to this parent
      if (data.studentId) {
        const student = await storage.getStudentById(data.studentId);
        if (!student || student.parentId !== user.id) {
          return res.status(403).json({ error: "Student does not belong to you" });
        }
      }

      // Guard: prevent duplicate active requests for the same teacher + student pair
      if (data.studentId) {
        const existingRequest = await prisma.tutorRequest.findFirst({
          where: {
            teacherId: data.teacherId,
            studentId: data.studentId,
            status: { in: ["pending", "approved"] },
          },
        });
        if (existingRequest) {
          const label = existingRequest.status === "approved"
            ? "already connected to this teacher"
            : "already has a pending request for this teacher";
          return res.status(409).json({ error: `This student is ${label}. Please wait for a response before sending another.` });
        }
      }

      let request = await storage.createTutorRequest(data);

      // When tutor-request mode is OFF, auto-approve immediately.
      // TutorRequest is the single authoritative link — no secondary TeacherStudentAssignment write needed.
      const isRequestMode = await isTutorRequestModeEnabled();
      if (!isRequestMode) {
        request = await storage.updateTutorRequest(request.id, {
          status: "approved",
          responseDate: new Date().toISOString(),
        });
      } else {
        // Notify the teacher of a new pending tutor request
        storage.createNotification({
          userId: data.teacherId as number,
          type: "new_tutor_request",
          title: "New Tutor Request",
          body: `${user!.name} has sent you a tutor request.`,
          link: "/dashboard#requests",
        }).catch(console.error);
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
      const requestId = parseInt(req.params.id);

      // Guard: dual-role user cannot approve their own tutor request
      const existingRequest = await storage.getTutorRequestById(requestId);
      if (existingRequest && existingRequest.parentId === user.id) {
        return res.status(400).json({ error: "You cannot approve your own tutor request" });
      }

      const request = await storage.updateTutorRequest(requestId, {
        status,
        responseDate: new Date().toISOString(),
      });

      // Notify the parent of approval or rejection
      if (existingRequest && (status === "approved" || status === "rejected")) {
        const statusText = status === "approved" ? "approved" : "declined";
        storage.createNotification({
          userId: existingRequest.parentId,
          type: "tutor_request_update",
          title: `Tutor Request ${status === "approved" ? "Approved" : "Declined"}`,
          body: `Your tutor request has been ${statusText} by ${user!.name}.`,
          link: "/dashboard#children",
        }).catch(console.error);
      }

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

  app.post("/api/messages/thread", requireAuth, async (req, res) => {
    try {
      const teacherUserId = parseInt(req.body.teacherUserId);
      const studentId = parseInt(req.body.studentId);
      const messageText = req.body.message as string;

      if (!teacherUserId || !studentId || !messageText?.trim()) {
        return res.status(400).json({ error: "teacherUserId, studentId, and message are required" });
      }

      const student = await storage.getStudentById(studentId);
      if (!student) return res.status(404).json({ error: "Student not found" });

      const requesterId = req.session.userId!;
      const isTeacher = requesterId === teacherUserId;
      const isStudent = requesterId === student.userId;
      const isParent = student.parentId != null && requesterId === student.parentId;

      if (!isTeacher && !isStudent && !isParent) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // In tutor-request mode, approved TutorRequest is the single source of truth.
      // In direct-assignment mode (mode OFF), all teachers can message any student.
      const tutorRequestMode = await isTutorRequestModeEnabled();
      if (tutorRequestMode) {
        const approvedRequest = await prisma.tutorRequest.findFirst({
          where: { studentId, teacherId: teacherUserId, status: "approved" },
        });
        if (!approvedRequest) {
          return res.status(403).json({ error: "Forbidden: teacher not assigned to this student" });
        }
      }

      const allParticipants = [teacherUserId, student.userId, student.parentId].filter(
        (id): id is number => id != null,
      );
      const recipients = allParticipants.filter((id) => id !== requesterId);

      const timestamp = new Date().toISOString();
      const created = await Promise.all(
        recipients.map((receiverId) =>
          storage.createMessage({
            senderId: requesterId,
            receiverId,
            message: messageText.trim(),
            timestamp,
            isRead: false,
          }),
        ),
      );

      res.json(created);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/messages/unread-count", requireAuth, async (req, res) => {
    try {
      const count = await prisma.message.count({
        where: { receiverId: req.session.userId!, isRead: false },
      });
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/messages/conversations", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const summaries = await storage.getConversationSummaries(user.id, user.role);
      res.json(summaries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/messages/thread-label", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        teacherUserId: z.number().int().positive(),
        studentId: z.number().int().positive(),
        name: z.string().max(60),
      });
      const parse = schema.safeParse(req.body);
      if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

      const { teacherUserId, studentId, name } = parse.data;
      const callerId = req.session.userId!;

      const student = await storage.getStudentById(studentId);
      if (!student) return res.status(404).json({ error: "Student not found" });

      const isTeacher  = callerId === teacherUserId;
      const isStudent  = callerId === student.userId;
      const isParent   = student.parentId !== null && callerId === student.parentId;
      if (!isTeacher && !isStudent && !isParent) {
        return res.status(403).json({ error: "Not a participant of this thread" });
      }

      const trimmed = name.trim();
      await storage.setThreadLabel(teacherUserId, studentId, trimmed === "" ? null : trimmed);
      res.json({ ok: true, name: trimmed === "" ? null : trimmed });
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

      // In tutor-request mode, approved TutorRequest is the single source of truth.
      // In direct-assignment mode (mode OFF), any teacher can read any student thread.
      const tutorRequestMode = await isTutorRequestModeEnabled();
      if (tutorRequestMode) {
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

  // Mark ALL messages in a thread as read for the current viewer (works on raw rows, not deduped)
  // Must come before /:id/read to avoid route conflicts
  app.patch("/api/messages/thread-read", requireAuth, async (req, res) => {
    try {
      const teacherId = parseInt(req.query.teacherId as string);
      const studentId = parseInt(req.query.studentId as string);
      if (!teacherId || !studentId) {
        return res.status(400).json({ error: "teacherId and studentId are required" });
      }

      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student) return res.status(404).json({ error: "Student not found" });

      const participantIds = [teacherId, student.userId, student.parentId].filter(Boolean) as number[];
      const viewerId = req.session.userId!;

      // Mark every raw DB row in this thread where the current user is the receiver as read
      await prisma.message.updateMany({
        where: {
          receiverId: viewerId,
          isRead: false,
          senderId: { in: participantIds },
        },
        data: { isRead: true },
      });

      res.json({ success: true });
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

      // Notify student and parent about the new progress report
      const reportStudent = await storage.getStudentById(data.studentId as number);
      if (reportStudent) {
        storage.createNotification({
          userId: reportStudent.userId,
          type: "progress_report",
          title: "New Progress Report",
          body: `A new progress report has been submitted by ${user!.name} for ${reportStudent.name}.`,
          link: "/dashboard#classrooms",
        }).catch(console.error);
        storage.createNotification({
          userId: reportStudent.parentId,
          type: "progress_report",
          title: "New Progress Report",
          body: `A new progress report has been submitted by ${user!.name} for ${reportStudent.name}.`,
          link: "/dashboard#reports",
        }).catch(console.error);
      }

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

      // Notify the assignment's teacher about the clarification question
      if (data.assignmentId) {
        const clarificationAssignment = await storage.getAssignmentById(data.assignmentId as number);
        if (clarificationAssignment?.teacherId) {
          storage.createNotification({
            userId: clarificationAssignment.teacherId,
            type: "new_clarification",
            title: "New Clarification Question",
            body: `${student.name} asked a clarification question on assignment "${clarificationAssignment.title}".`,
            link: "/dashboard#students",
          }).catch(console.error);
        }
      }

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
            roles: ["teacher"],
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
            roles: ["teacher"],
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
            roles: ["teacher"],
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
            roles: ["parent"],
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
            roles: ["student"],
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
            roles: ["student"],
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
            roles: ["student"],
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

          // TutorRequest is the single source of truth — no TSA write needed in seed

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
          // TutorRequest is the single source of truth — no TSA write needed in seed

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
          // TutorRequest is the single source of truth — no TSA write needed in seed

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

        const newSessionId = await createSession(targetUser.id);
        const studentProfile = targetUser.role === "student" ? await storage.getStudentByUserId(targetUser.id) : null;

        return res.json({
          sessionId: newSessionId,
          user: {
            id: targetUser.id,
            email: targetUser.email,
            name: targetUser.name,
            role: targetUser.role,
            roles: targetUser.roles ?? [],
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

    // POST /api/dev/reset-db — wipe all user data and reset seed flag for fresh testing
    app.post("/api/dev/reset-db", async (_req, res) => {
      try {
        // Delete in FK-safe order (children before parents)
        await prisma.$transaction([
          prisma.classroomSubmission.deleteMany(),
          prisma.classroomMaterial.deleteMany(),
          prisma.classroomAssignment.deleteMany(),
          prisma.classroomPost.deleteMany(),
          prisma.classroomEnrollment.deleteMany(),
          prisma.classroom.deleteMany(),
          prisma.tutorRating.deleteMany(),
          prisma.payment.deleteMany(),
          prisma.earnings.deleteMany(),
          prisma.attendance.deleteMany(),
          prisma.session.deleteMany(),
          prisma.feedback.deleteMany(),
          prisma.schedule.deleteMany(),
          prisma.clarification.deleteMany(),
          prisma.studentAssignment.deleteMany(),
          prisma.assignment.deleteMany(),
          prisma.material.deleteMany(),
          prisma.progressReport.deleteMany(),
          prisma.parentalControl.deleteMany(),
          prisma.teacherStudentAssignment.deleteMany(),
          prisma.tutorRequest.deleteMany(),
          prisma.studentInvite.deleteMany(),
          prisma.threadLabel.deleteMany(),
          prisma.message.deleteMany(),
          prisma.authSession.deleteMany(),
          prisma.student.deleteMany(),
          prisma.user.deleteMany(),
          prisma.systemSettings.deleteMany(),
        ]);
        console.log("[dev] Database reset complete — all data wiped");
        res.json({ cleared: true });
      } catch (error: any) {
        console.error("[dev] reset-db error:", error);
        res.status(500).json({ error: error.message });
      }
    });
  }

  // ========== ADMIN ROUTES ==========

  // GET /api/admin/users — list all users (admin + super admin)
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const sanitized = users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        profilePicture: u.profilePicture ?? null,
        isEmailVerified: u.isEmailVerified,
        googleId: u.googleId ?? null,
        isAdmin: u.isAdmin ?? false,
        isSuperAdmin: u.isSuperAdmin ?? false,
        createdAt: u.createdAt ? (u.createdAt as unknown as Date).toISOString() : null,
      }));
      res.json(sanitized);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // PATCH /api/admin/users/:id/role — change role (super admin only, teacher/parent only, not students)
  app.patch("/api/admin/users/:id/role", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { role } = req.body;
      if (!["teacher", "parent"].includes(role)) {
        return res.status(400).json({ error: "Role must be teacher or parent" });
      }
      // Prevent reassigning students server-side
      const target = await storage.getUserById(id);
      if (!target) return res.status(404).json({ error: "User not found" });
      if (target.role === "student") {
        return res.status(400).json({ error: "Cannot change the role of a student account" });
      }
      const updated = await storage.updateUser(id, { role });
      res.json({ success: true, id: updated.id, role: updated.role });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // PATCH /api/admin/users/:id/admin — toggle isAdmin (super admin only; cannot change super admins or self)
  app.patch("/api/admin/users/:id/admin", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isAdmin } = req.body;
      if (typeof isAdmin !== "boolean") {
        return res.status(400).json({ error: "isAdmin must be boolean" });
      }
      if (req.session.userId === id) {
        return res.status(400).json({ error: "Cannot change your own admin status" });
      }
      const target = await storage.getUserById(id);
      if (!target) return res.status(404).json({ error: "User not found" });
      if (target.isSuperAdmin) {
        return res.status(400).json({ error: "Cannot change admin status of a super admin" });
      }
      const updated = await storage.updateUser(id, { isAdmin });
      res.json({ success: true, id: updated.id, isAdmin: updated.isAdmin });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // PATCH /api/admin/users/:id/super-admin — toggle isSuperAdmin (super admin only; self-demotion guarded)
  app.patch("/api/admin/users/:id/super-admin", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isSuperAdmin } = req.body;
      if (typeof isSuperAdmin !== "boolean") {
        return res.status(400).json({ error: "isSuperAdmin must be boolean" });
      }
      if (req.session.userId === id && !isSuperAdmin) {
        return res.status(400).json({ error: "Cannot remove your own super admin status" });
      }
      const updatePayload: Prisma.UserUpdateInput = {
        isSuperAdmin,
        ...(isSuperAdmin ? { isAdmin: true } : {}),
      };
      const updated = await storage.updateUser(id, updatePayload);
      res.json({ success: true, id: updated.id, isSuperAdmin: updated.isSuperAdmin, isAdmin: updated.isAdmin });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/students/me — resolve the current user's student record
  app.get("/api/students/me", requireAuth, async (req, res) => {
    try {
      const student = await storage.getStudentByUserId(req.session.userId!);
      if (!student) return res.status(404).json({ error: "No student profile for this user" });
      res.json({ id: student.id, name: student.name, userId: student.userId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Classroom routes ────────────────────────────────────────────────────

  // Helper: verify classroom belongs to requesting teacher
  async function requireClassroomOwner(req: any, res: any): Promise<any | null> {
    const classroomId = parseInt(req.params.classroomId || req.params.id);
    const classroom = await storage.getClassroomById(classroomId);
    if (!classroom) { res.status(404).json({ error: "Classroom not found" }); return null; }
    if (classroom.teacherId !== req.session.userId) { res.status(403).json({ error: "Not your classroom" }); return null; }
    return classroom;
  }

  async function requireClassroomMember(req: any, res: any): Promise<any | null> {
    const classroomId = parseInt(req.params.classroomId || req.params.id);
    if (isNaN(classroomId)) { res.status(400).json({ error: "Invalid classroom id" }); return null; }
    const classroom = await storage.getClassroomById(classroomId);
    if (!classroom) { res.status(404).json({ error: "Classroom not found" }); return null; }
    const userId = req.session.userId as number;
    if (classroom.teacherId === userId) return classroom;
    const user = await storage.getUserById(userId);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return null; }
    const enrollments = await storage.getEnrollments(classroomId);
    if (user.role === "student") {
      const student = await storage.getStudentByUserId(userId);
      if (student && enrollments.some((e: any) => e.studentId === student.id)) return classroom;
    } else if (user.role === "parent") {
      const children = await storage.getStudentsByParent(userId);
      const enrolledIds = new Set(enrollments.map((e: any) => e.studentId));
      if (children.some((c: any) => enrolledIds.has(c.id))) return classroom;
    }
    res.status(403).json({ error: "You are not a member of this classroom" });
    return null;
  }

  // POST /api/classrooms — teacher creates a classroom
  app.post("/api/classrooms", requireAuth, async (req, res) => {
    try {
      const actor = await storage.getUserById(req.session.userId!);
      if (!actor || !actor.roles.includes("teacher")) {
        return res.status(403).json({ error: "Only teachers can create classrooms" });
      }
      const data = z.object({
        name: z.string().min(1),
        subject: z.string().min(1),
        description: z.string().optional(),
      }).parse(req.body);
      const classroom = await storage.createClassroom({
        name: data.name,
        subject: data.subject,
        description: data.description ?? null,
        teacherId: req.session.userId!,
        status: "active",
      });
      res.status(201).json(classroom);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // GET /api/classrooms — list classrooms for the current user's role
  app.get("/api/classrooms", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      if (user.role === "teacher") {
        const classrooms = await storage.getClassroomsByTeacher(user.id);
        return res.json(classrooms);
      }
      if (user.role === "student") {
        const student = await storage.getStudentByUserId(user.id);
        if (!student) return res.json([]);
        const classrooms = await storage.getClassroomsForStudent(student.id);
        return res.json(classrooms);
      }
      return res.json([]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/classrooms/parent/:studentId — parent views classrooms for their child
  app.get("/api/classrooms/parent/:studentId", requireAuth, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const student = await storage.getStudentById(studentId);
      if (!student) return res.status(404).json({ error: "Student not found" });
      if (student.parentId !== req.session.userId!) return res.status(403).json({ error: "Not your child" });
      const classrooms = await storage.getClassroomsForParent(studentId);
      res.json(classrooms);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/classrooms/:id — get classroom detail (teacher or enrolled member only)
  app.get("/api/classrooms/:id", requireAuth, async (req, res) => {
    try {
      const classroom = await requireClassroomMember(req, res);
      if (!classroom) return;
      res.json(classroom);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // PATCH /api/classrooms/:id — teacher updates classroom (name, subject, description, status)
  app.patch("/api/classrooms/:id", requireAuth, async (req, res) => {
    try {
      const classroom = await requireClassroomOwner(req, res);
      if (!classroom) return;
      const data = z.object({
        name: z.string().min(1).optional(),
        subject: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        status: z.enum(["active", "archived"]).optional(),
      }).parse(req.body);
      const updated = await storage.updateClassroom(classroom.id, data);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // DELETE /api/classrooms/:id — teacher deletes classroom
  app.delete("/api/classrooms/:id", requireAuth, async (req, res) => {
    try {
      const classroom = await requireClassroomOwner(req, res);
      if (!classroom) return;
      await storage.deleteClassroom(classroom.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/classrooms/:classroomId/enroll — teacher enrolls a student
  // Only classroom ownership is required; no TutorRequest link needed (classrooms are open group workspaces).
  app.post("/api/classrooms/:classroomId/enroll", requireAuth, async (req, res) => {
    try {
      const classroom = await requireClassroomOwner(req, res);
      if (!classroom) return;
      if (classroom.status === "archived") return res.status(400).json({ error: "Cannot enroll students in an archived classroom" });
      const { studentId } = z.object({ studentId: z.number() }).parse(req.body);
      const enrollment = await storage.enrollStudent(classroom.id, studentId);
      res.status(201).json(enrollment);
    } catch (error: any) {
      if (error.code === "P2002") return res.status(409).json({ error: "Student is already enrolled" });
      res.status(400).json({ error: error.message });
    }
  });

  // DELETE /api/classrooms/:classroomId/students/:studentId — teacher removes a student
  app.delete("/api/classrooms/:classroomId/students/:studentId", requireAuth, async (req, res) => {
    try {
      const classroom = await requireClassroomOwner(req, res);
      if (!classroom) return;
      if (classroom.status === "archived") return res.status(400).json({ error: "Cannot modify enrollment in an archived classroom" });
      const studentId = parseInt(req.params.studentId);
      await storage.unenrollStudent(classroom.id, studentId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/classrooms/:classroomId/enrollments — get enrolled students (teacher only)
  app.get("/api/classrooms/:classroomId/enrollments", requireAuth, async (req, res) => {
    try {
      const classroom = await requireClassroomOwner(req, res);
      if (!classroom) return;
      const enrollments = await storage.getEnrollments(classroom.id);
      res.json(enrollments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/classrooms/:classroomId/posts — post to feed
  app.post("/api/classrooms/:classroomId/posts", requireAuth, async (req, res) => {
    try {
      const classroomId = parseInt(req.params.classroomId);
      const classroom = await storage.getClassroomById(classroomId);
      if (!classroom) return res.status(404).json({ error: "Classroom not found" });
      if (classroom.status === "archived") return res.status(400).json({ error: "Cannot post to an archived classroom" });
      if (classroom.teacherId !== req.session.userId!) return res.status(403).json({ error: "Not your classroom" });
      const { content } = z.object({ content: z.string().min(1) }).parse(req.body);
      const post = await storage.createClassroomPost({ classroomId, authorId: req.session.userId!, content });

      // Notify all enrolled students about the new post
      const postEnrollments = await storage.getEnrollments(classroomId);
      for (const enrollment of postEnrollments) {
        const postStudent = await storage.getStudentById(enrollment.student.id);
        if (postStudent?.userId) {
          storage.createNotification({
            userId: postStudent.userId,
            type: "new_post",
            title: "New Classroom Post",
            body: `New post in "${classroom.name}": ${content.slice(0, 80)}${content.length > 80 ? "…" : ""}`,
            link: `/classrooms/${classroomId}`,
          }).catch(console.error);
        }
      }

      res.status(201).json(post);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // GET /api/classrooms/:classroomId/posts — get feed (classroom members only)
  app.get("/api/classrooms/:classroomId/posts", requireAuth, async (req, res) => {
    try {
      const classroom = await requireClassroomMember(req, res);
      if (!classroom) return;
      const posts = await storage.getClassroomPosts(classroom.id);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/classrooms/:classroomId/assignments — teacher creates assignment
  app.post("/api/classrooms/:classroomId/assignments", requireAuth, async (req, res) => {
    try {
      const classroom = await requireClassroomOwner(req, res);
      if (!classroom) return;
      if (classroom.status === "archived") return res.status(400).json({ error: "Cannot add assignments to an archived classroom" });
      const data = z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        dueDate: z.string().min(1),
        points: z.number().int().min(1).max(10000),
      }).parse(req.body);
      const assignment = await storage.createClassroomAssignment({ classroomId: classroom.id, ...data });

      // Notify all enrolled students
      const enrollments = await storage.getEnrollments(classroom.id);
      for (const enrollment of enrollments) {
        const studentUser = await storage.getStudentById(enrollment.student.id);
        if (studentUser?.userId) {
          storage.createNotification({
            userId: studentUser.userId,
            type: "new_assignment",
            title: "New Classroom Assignment",
            body: `New assignment in "${classroom.name}": "${assignment.title}" — due ${assignment.dueDate}`,
            link: `/classrooms/${classroom.id}`,
          }).catch(console.error);
        }
      }

      res.status(201).json(assignment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // POST /api/classrooms/:classroomId/assignments/with-file — teacher creates assignment with optional file
  app.post("/api/classrooms/:classroomId/assignments/with-file", requireAuth, memoryUpload.single("file"), async (req, res) => {
    try {
      const classroom = await requireClassroomOwner(req, res);
      if (!classroom) return;
      if (classroom.status === "archived") return res.status(400).json({ error: "Cannot add assignments to an archived classroom" });
      const data = z.object({
        title: z.string().min(1),
        description: z.string(),
        dueDate: z.string().min(1),
        points: z.preprocess((v) => parseInt(v as string, 10), z.number().int().min(1).max(10000)),
      }).parse(req.body);

      let fileUrl: string | undefined;
      if (req.file) {
        const uploadResult = await uploadBufferToCloudinary(req.file.buffer, req.file.originalname, "classroom-assignments");
        if (!uploadResult.success) return res.status(500).json({ error: uploadResult.error ?? "File upload failed" });
        fileUrl = uploadResult.url;
      }

      const assignment = await storage.createClassroomAssignment({ classroomId: classroom.id, ...data, fileUrl });

      // Notify all enrolled students
      const enrollments2 = await storage.getEnrollments(classroom.id);
      for (const enrollment of enrollments2) {
        const studentUser = await storage.getStudentById(enrollment.student.id);
        if (studentUser?.userId) {
          storage.createNotification({
            userId: studentUser.userId,
            type: "new_assignment",
            title: "New Classroom Assignment",
            body: `New assignment in "${classroom.name}": "${assignment.title}" — due ${assignment.dueDate}`,
            link: `/classrooms/${classroom.id}`,
          }).catch(console.error);
        }
      }

      res.status(201).json(assignment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // GET /api/classrooms/:classroomId/assignments — list assignments (classroom members only)
  app.get("/api/classrooms/:classroomId/assignments", requireAuth, async (req, res) => {
    try {
      const classroom = await requireClassroomMember(req, res);
      if (!classroom) return;
      const assignments = await storage.getClassroomAssignments(classroom.id);
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE /api/classrooms/:classroomId/assignments/:assignmentId — teacher deletes assignment
  app.delete("/api/classrooms/:classroomId/assignments/:assignmentId", requireAuth, async (req, res) => {
    try {
      const classroom = await requireClassroomOwner(req, res);
      if (!classroom) return;
      await storage.deleteClassroomAssignment(parseInt(req.params.assignmentId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/classrooms/:classroomId/assignments/:assignmentId/submissions — teacher views submissions
  app.get("/api/classrooms/:classroomId/assignments/:assignmentId/submissions", requireAuth, async (req, res) => {
    try {
      const classroom = await requireClassroomOwner(req, res);
      if (!classroom) return;
      const submissions = await storage.getSubmissionsForAssignment(parseInt(req.params.assignmentId));
      res.json(submissions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/classrooms/:classroomId/my-submissions — student/parent views their own submissions
  app.get("/api/classrooms/:classroomId/my-submissions", requireAuth, async (req, res) => {
    try {
      const classroomId = parseInt(req.params.classroomId);
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      let studentId: number;
      if (user.role === "student") {
        const student = await storage.getStudentByUserId(user.id);
        if (!student) return res.json([]);
        studentId = student.id;
      } else if (user.role === "parent") {
        const sid = parseInt(req.query.studentId as string);
        if (!sid) return res.status(400).json({ error: "studentId query param required" });
        const student = await storage.getStudentById(sid);
        if (!student || student.parentId !== user.id) return res.status(403).json({ error: "Not your child" });
        studentId = student.id;
      } else {
        return res.status(403).json({ error: "Forbidden" });
      }
      const submissions = await storage.getSubmissionsForStudent(studentId, classroomId);
      res.json(submissions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/classrooms/:classroomId/assignments/:assignmentId/submit — student submits
  app.post("/api/classrooms/:classroomId/assignments/:assignmentId/submit", requireAuth, memoryUpload.single("file"), async (req, res) => {
    try {
      const classroomId = parseInt(req.params.classroomId);
      const assignmentId = parseInt(req.params.assignmentId);
      const classroom = await storage.getClassroomById(classroomId);
      if (!classroom) return res.status(404).json({ error: "Classroom not found" });
      if (classroom.status === "archived") return res.status(400).json({ error: "Cannot submit to an archived classroom" });
      const user = await storage.getUserById(req.session.userId!);
      if (!user || user.role !== "student") return res.status(403).json({ error: "Students only" });
      const student = await storage.getStudentByUserId(user.id);
      if (!student) return res.status(403).json({ error: "Student profile not found" });
      const { content } = z.object({ content: z.string() }).parse(req.body);
      const assignments = await storage.getClassroomAssignments(classroomId);
      const assignment = assignments.find((a) => a.id === assignmentId);
      if (!assignment) return res.status(404).json({ error: "Assignment not found" });
      
      let fileUrl: string | undefined;
      if (req.file) {
        const uploadResult = await uploadBufferToCloudinary(req.file.buffer, req.file.originalname, "classroom-submissions");
        fileUrl = uploadResult.secure_url;
      }
      
      const submission = await storage.submitClassroomAssignment(assignmentId, student.id, content, assignment.dueDate, fileUrl);

      // Notify the teacher that a student submitted
      storage.createNotification({
        userId: classroom.teacherId,
        type: "assignment_submitted",
        title: "Assignment Submitted",
        body: `${user.name} submitted "${assignment.title}" in "${classroom.name}".`,
        link: `/classrooms/${classroom.id}`,
      }).catch(console.error);

      res.json(submission);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // PATCH /api/classrooms/:classroomId/submissions/:submissionId/grade — teacher grades
  app.patch("/api/classrooms/:classroomId/submissions/:submissionId/grade", requireAuth, async (req, res) => {
    try {
      const classroom = await requireClassroomOwner(req, res);
      if (!classroom) return;
      const { grade, feedback } = z.object({
        grade: z.number().int().min(0),
        feedback: z.string().nullable().optional(),
      }).parse(req.body);
      // Get assignment to know max points
      const submissionId = parseInt(req.params.submissionId);
      const sub = await prisma.classroomSubmission.findUnique({
        where: { id: submissionId },
        include: { assignment: { select: { points: true } } },
      });
      if (!sub) return res.status(404).json({ error: "Submission not found" });
      const updated = await storage.gradeClassroomSubmission(submissionId, grade, feedback ?? null, sub.assignment.points);

      // Notify the student their submission was graded
      const gradedStudent = await storage.getStudentById(sub.studentId);
      if (gradedStudent?.userId) {
        const classroomData = await storage.getClassroomById(parseInt(req.params.classroomId));
        const assignmentData = await prisma.classroomAssignment.findUnique({ where: { id: sub.assignmentId }, select: { title: true } });
        storage.createNotification({
          userId: gradedStudent.userId,
          type: "assignment_graded",
          title: "Assignment Graded",
          body: `Your submission for "${assignmentData?.title ?? "assignment"}" in "${classroomData?.name ?? "classroom"}" has been graded: ${grade}/${sub.assignment.points}`,
          link: `/classrooms/${classroom.id}`,
        }).catch(console.error);
        // Also notify the parent
        if (gradedStudent.parentId) {
          storage.createNotification({
            userId: gradedStudent.parentId,
            type: "assignment_graded",
            title: "Assignment Graded",
            body: `${gradedStudent.name}'s submission for "${assignmentData?.title ?? "assignment"}" was graded: ${grade}/${sub.assignment.points}`,
            link: `/classrooms/${classroom.id}`,
          }).catch(console.error);
        }
      }

      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // POST /api/classrooms/:classroomId/materials — teacher adds material
  app.post("/api/classrooms/:classroomId/materials", requireAuth, async (req, res) => {
    try {
      const classroom = await requireClassroomOwner(req, res);
      if (!classroom) return;
      if (classroom.status === "archived") return res.status(400).json({ error: "Cannot add materials to an archived classroom" });
      const data = z.object({
        title: z.string().min(1),
        description: z.string(),
        url: z.string().url(),
      }).parse(req.body);
      const material = await storage.createClassroomMaterial({ classroomId: classroom.id, ...data });
      res.status(201).json(material);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // GET /api/classrooms/:classroomId/materials — get materials (classroom members only)
  app.get("/api/classrooms/:classroomId/materials", requireAuth, async (req, res) => {
    try {
      const classroom = await requireClassroomMember(req, res);
      if (!classroom) return;
      const materials = await storage.getClassroomMaterials(classroom.id);
      res.json(materials);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE /api/classrooms/:classroomId/materials/:materialId — teacher removes material
  app.delete("/api/classrooms/:classroomId/materials/:materialId", requireAuth, async (req, res) => {
    try {
      const classroom = await requireClassroomOwner(req, res);
      if (!classroom) return;
      await storage.deleteClassroomMaterial(parseInt(req.params.materialId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== NOTIFICATION ROUTES ==========

  // GET /api/notifications — list notifications for current user
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifications = await storage.getNotificationsForUser(req.session.userId!);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/notifications/count — unread count for current user
  app.get("/api/notifications/count", requireAuth, async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.session.userId!);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // PATCH /api/notifications/read-all — mark all notifications as read (must be before /:id/read)
  app.patch("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      await storage.markAllNotificationsRead(req.session.userId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // PATCH /api/notifications/:id/read — mark a single notification as read
  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      await storage.markNotificationRead(parseInt(req.params.id), req.session.userId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
