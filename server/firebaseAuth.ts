import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { UpsertUser } from "@shared/schema";

// Handle Firebase login
export async function handleFirebaseLogin(req: Request, res: Response) {
  try {
    const { uid, email, displayName, photoURL } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ message: "Missing required user information" });
    }

    // Split displayName into first and last name if available
    let firstName = null;
    let lastName = null;
    
    if (displayName) {
      const nameParts = displayName.split(" ");
      firstName = nameParts[0] || null;
      lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;
    }

    // First check if a user with this email already exists
    let existingUser = null;
    if (email) {
      try {
        existingUser = await storage.getUserByEmail(email);
      } catch (error) {
        console.log("Error checking for existing user:", error);
      }
    }

    let user;
    if (existingUser) {
      // If a user with this email already exists, just return that user
      user = existingUser;
      console.log("Using existing user account with email:", email);
    } else {
      // Otherwise create a new user
      const userData: UpsertUser = {
        id: uid,
        email,
        firstName,
        lastName,
        profileImageUrl: photoURL || null,
      };

      user = await storage.upsertUser(userData);
    }

    // Set user in session
    if (req.session) {
      req.session.firebaseUser = {
        uid,
        email,
        displayName,
        photoURL,
      };
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Firebase login error:", error);
    return res.status(500).json({ message: "Authentication failed" });
  }
}

// Handle Firebase logout
export async function handleFirebaseLogout(req: Request, res: Response) {
  try {
    // Clear the firebase user from session
    if (req.session) {
      delete req.session.firebaseUser;
    }

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Firebase logout error:", error);
    return res.status(500).json({ message: "Logout failed" });
  }
}

// Middleware to check if user is authenticated with Firebase
export function isFirebaseAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.firebaseUser) {
    return next();
  }

  return res.status(401).json({ message: "Unauthorized" });
}