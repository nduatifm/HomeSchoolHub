import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { sendVerificationEmail } from "./emailService";
import { randomBytes } from "crypto";

export async function handleEmailPasswordSignup(req: Request, res: Response) {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const verificationToken = randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await storage.createUser({
      email,
      password: hashedPassword,
      firstName,
      lastName,
    });

    await storage.updateUserVerification(
      user.id,
      false,
      verificationToken,
      verificationTokenExpiry
    );

    try {
      await sendVerificationEmail(email, verificationToken, firstName || undefined);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    return res.status(201).json({
      message: "User created successfully. Please check your email to verify your account.",
      userId: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Failed to create user" });
  }
}

export async function handleEmailPasswordLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await storage.getUserByEmail(email);
    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ 
        message: "Please verify your email before logging in",
        needsVerification: true,
        email: user.email
      });
    }

    if (req.session) {
      req.session.emailPasswordUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      };
    }

    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Login failed" });
  }
}

export async function handleEmailVerification(req: Request, res: Response) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }

    const user = await storage.getUserByVerificationToken(token);
    
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    await storage.updateUserVerification(user.id, true, null, null);

    return res.status(200).json({ 
      message: "Email verified successfully! You can now log in.",
      verified: true
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return res.status(500).json({ message: "Email verification failed" });
  }
}

export async function handleResendVerification(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    const verificationToken = randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await storage.updateUserVerification(
      user.id,
      false,
      verificationToken,
      verificationTokenExpiry
    );

    try {
      await sendVerificationEmail(
        email,
        verificationToken,
        user.firstName || undefined
      );
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      return res.status(500).json({ message: "Failed to send verification email" });
    }

    return res.status(200).json({ 
      message: "Verification email has been resent. Please check your inbox."
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return res.status(500).json({ message: "Failed to resend verification email" });
  }
}

export async function handleEmailPasswordLogout(req: Request, res: Response) {
  try {
    if (req.session) {
      delete req.session.emailPasswordUser;
    }
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Logout failed" });
  }
}

export function isEmailPasswordAuthenticated(req: Request, res: Response, next: Function) {
  if (req.session && req.session.emailPasswordUser) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}
