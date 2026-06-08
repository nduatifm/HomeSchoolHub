import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "server", "logs");
const LOG_FILE = path.join(LOG_DIR, "auth-events.jsonl");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

export type AuthEventType =
  | "login_success"
  | "login_failure"
  | "signup"
  | "logout"
  | "google_auth"
  | "student_signup"
  | "password_reset_request"
  | "password_reset_success"
  | "impersonation_start"
  | "session_expired";

export interface AuthEvent {
  ts: string;
  event: AuthEventType;
  userId?: number;
  email?: string;
  ip?: string;
  userAgent?: string;
  detail?: string;
}

export function logAuthEvent(event: AuthEvent): void {
  try {
    ensureLogDir();
    const line = JSON.stringify({ ...event, ts: new Date().toISOString() }) + "\n";
    fs.appendFileSync(LOG_FILE, line, "utf8");
  } catch {
  }
}
