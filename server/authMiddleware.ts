import { Request, Response, NextFunction } from "express";

// Universal authentication middleware that supports all auth methods
export function isUniversallyAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Check for Replit Auth
  if ((req as any).user) {
    return next();
  }
  
  // Check for Firebase Auth session
  if (req.session && (req.session as any).firebaseUser) {
    return next();
  }
  
  // Check for Email/Password Auth session
  if (req.session && (req.session as any).emailPasswordUser) {
    return next();
  }
  
  // No valid authentication found
  return res.status(401).json({ message: "Unauthorized" });
}

// Helper to get user ID from any auth method
export function getUserIdFromSession(req: Request): string | null {
  // Check Replit Auth
  if ((req as any).user?.claims?.sub) {
    return (req as any).user.claims.sub;
  }
  
  // Check Firebase Auth
  if (req.session && (req.session as any).firebaseUser?.uid) {
    return (req.session as any).firebaseUser.uid;
  }
  
  // Check Email/Password Auth
  if (req.session && (req.session as any).emailPasswordUser?.id) {
    return (req.session as any).emailPasswordUser.id;
  }
  
  return null;
}
