export interface GoogleAuthOptions {
  next?: string;
  teamInvite?: string;
  flow?: "login" | "signup";
}

let googleSignInAvailable: boolean | null = null;

export async function loadGoogleSignInAvailability(): Promise<boolean> {
  if (googleSignInAvailable !== null) return googleSignInAvailable;
  try {
    const res = await fetch("/api/auth/google/available");
    if (!res.ok) {
      googleSignInAvailable = false;
      return false;
    }
    const data = (await res.json()) as { available?: boolean };
    googleSignInAvailable = Boolean(data.available);
  } catch {
    googleSignInAvailable = false;
  }
  return googleSignInAvailable;
}

export function getGoogleAuthUrl(options: GoogleAuthOptions = {}): string {
  const params = new URLSearchParams();
  if (options.flow) params.set("flow", options.flow);
  if (options.next) params.set("next", options.next);
  if (options.teamInvite) params.set("teamInvite", options.teamInvite);
  const query = params.toString();
  return `/api/auth/google/authorize${query ? `?${query}` : ""}`;
}

export function getStudentGoogleSignupUrl(code: string): string {
  return `/api/auth/signup/student/authorize?code=${encodeURIComponent(code)}`;
}

export function handleGoogleSignIn(options: GoogleAuthOptions = {}): void {
  window.location.href = getGoogleAuthUrl(options);
}

export function handleStudentGoogleSignup(code: string): void {
  window.location.href = getStudentGoogleSignupUrl(code.trim().toUpperCase());
}

/** Returns cached availability; call loadGoogleSignInAvailability() on mount first. */
export function isGoogleSignInAvailable(): boolean {
  return googleSignInAvailable ?? false;
}
