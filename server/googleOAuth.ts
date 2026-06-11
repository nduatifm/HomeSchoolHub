import crypto from "crypto";
import type { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";

const STATE_TTL_MS = 5 * 60 * 1000;
const PENDING_COOKIE = "google_oauth_pending";
const PENDING_TTL_MS = 5 * 60 * 1000;

const FALLBACK_CLIENT_ID =
  "92937113563-pbbl6p4p161pdc36voaetu1u2v5mdtfp.apps.googleusercontent.com";

function getSecret(): string {
  return (
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.DATABASE_URL ||
    "dev-oauth-state-secret"
  );
}

export function getGoogleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID || FALLBACK_CLIENT_ID;
}

export function getGoogleOAuth2Client(redirectUri: string): OAuth2Client {
  return new OAuth2Client({
    clientId: getGoogleClientId(),
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
  });
}

export function getGoogleRedirectUri(req: Request): string {
  // const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  // const host =
  //   (req.headers["x-forwarded-host"] as string) || req.headers.host || "localhost";
  // return `${proto}://${host}/api/auth/google/callback`;
  return `https://www.lyraprep.com/api/auth/google/callback`;
}

export interface OAuthStatePayload {
  next?: string;
  role?: "teacher" | "parent";
  inviteCode?: string;
  flow: "login" | "signup" | "student_signup";
  teamInvite?: string;
}

type SignedOAuthState = OAuthStatePayload & {
  nonce: string;
  exp: number;
};

function signPayload(payload: object): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

function verifySignedPayload<T extends { exp: number }>(
  token: string,
): T | null {
  const dot = token.indexOf(".");
  if (dot === -1) return null;
  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const data = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as T;
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function createOAuthState(payload: OAuthStatePayload): string {
  return signPayload({
    ...payload,
    nonce: crypto.randomBytes(16).toString("hex"),
    exp: Date.now() + STATE_TTL_MS,
  });
}

export function verifyOAuthState(state: string): SignedOAuthState | null {
  return verifySignedPayload<SignedOAuthState>(state);
}

export interface PendingGoogleAuth {
  googleId: string;
  email?: string;
  name: string;
  profilePicture?: string;
  next?: string;
  teamInvite?: string;
  exp: number;
}

export function setPendingGoogleAuth(
  res: Response,
  data: Omit<PendingGoogleAuth, "exp">,
): void {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(PENDING_COOKIE, signPayload({ ...data, exp: Date.now() + PENDING_TTL_MS }), {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "strict" : "lax",
    maxAge: PENDING_TTL_MS,
    path: "/",
  });
}

export function readPendingGoogleAuth(req: Request): PendingGoogleAuth | null {
  const token = (req as Request & { cookies?: Record<string, string> }).cookies?.[
    PENDING_COOKIE
  ];
  if (!token) return null;
  return verifySignedPayload<PendingGoogleAuth>(token);
}

export function clearPendingGoogleAuth(res: Response): void {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie(PENDING_COOKIE, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "strict" : "lax",
    path: "/",
  });
}

export function redirectWithGoogleError(
  res: Response,
  error: string,
  basePath = "/login",
): void {
  res.redirect(`${basePath}?google_error=${encodeURIComponent(error)}`);
}

export function buildGoogleAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function sanitizeNextPath(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}
