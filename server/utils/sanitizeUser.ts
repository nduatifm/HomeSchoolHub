import { User } from "@shared/schema";

// Helper function to sanitize user objects by removing sensitive fields
export function sanitizeUser(user: User) {
  const { 
    password: _, 
    verificationToken: __, 
    verificationTokenExpiry: ___, 
    ...safeUser 
  } = user;
  
  return safeUser;
}

// Helper to sanitize arrays of users
export function sanitizeUsers(users: User[]) {
  return users.map(sanitizeUser);
}
