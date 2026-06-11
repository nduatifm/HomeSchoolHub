export interface GoogleAuthOptions {
  next?: string;
  teamInvite?: string;
  flow?: "login" | "signup";
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
  console.log("getGoogleAuthUrl: ", getGoogleAuthUrl(options));
  window.location.href = getGoogleAuthUrl(options);
}

export function handleStudentGoogleSignup(code: string): void {
  window.location.href = getStudentGoogleSignupUrl(code.trim().toUpperCase());
}

export function isGoogleSignInAvailable(): boolean {
  return true;
}
