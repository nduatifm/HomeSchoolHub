import "express-session";

declare module "express-session" {
  interface SessionData {
    firebaseUser?: {
      uid: string;
      email: string;
      displayName?: string;
      photoURL?: string;
    };
    emailPasswordUser?: {
      id: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
    };
  }
}
