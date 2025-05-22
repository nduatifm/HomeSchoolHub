import 'express-session';

declare module 'express-session' {
  interface SessionData {
    firebaseUser?: {
      uid: string;
      email: string;
      displayName?: string;
      photoURL?: string;
    };
  }
}