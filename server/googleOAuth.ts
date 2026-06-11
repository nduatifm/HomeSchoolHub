import crypto from "crypto";
import type { Request, Response } from "express";
import passport from "passport";
import type { AuthenticateOptions } from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { OAuth2Client } from "google-auth-library";

const STATE_TTL_MS = 5 * 60 * 1000;
const PENDING_COOKIE = "google_oauth_pending";
const PENDING_TTL_MS = 5 * 60 * 1000;

export const GOOGLE_STRATEGY = "google";

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
  // return process.env.GOOGLE_CLIENT_ID || FALLBACK_CLIENT_ID;
  return FALLBACK_CLIENT_ID;
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_SECRET);
}

export function getGoogleOAuth2Client(redirectUri: string): OAuth2Client {
  return new OAuth2Client({
    clientId: getGoogleClientId(),
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
  });
}

export function getGoogleRedirectUri(req: Request): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const host =
    (req.headers["x-forwarded-host"] as string) || req.headers.host || "localhost";
  return `${proto}://${host}/api/auth/google/callback`;
}

export interface OAuthStatePayload {
  next?: string;
  role?: "teacher" | "parent";
  inviteCode?: string;
  flow: "login" | "signup" | "student_signup";
  teamInvite?: string;
  redirectUri?: string;
}

export type SignedOAuthState = OAuthStatePayload & {
  nonce: string;
  exp: number;
};

export interface GoogleAuthProfile {
  googleId: string;
  email?: string;
  name: string;
  profilePicture?: string;
  emailVerified: boolean;
  state: SignedOAuthState;
}

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

export function sanitizeNextPath(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}

export function googleErrorBaseFromState(stateParam: unknown): string {
  if (typeof stateParam !== "string") return "/login";
  const state = verifyOAuthState(stateParam);
  return state?.flow === "student_signup" ? "/student-signup" : "/login";
}

/** Passport OAuth2 accepts callbackURL at runtime; types omit it on AuthenticateOptions. */
export function buildGoogleAuthenticateOptions(options: {
  state?: string;
  callbackURL: string;
}): AuthenticateOptions {
  return {
    session: false,
    scope: ["profile", "email"],
    state: options.state,
    callbackURL: options.callbackURL,
  } as AuthenticateOptions;
}

type GoogleAuthCallback = (
  err: unknown,
  profile: GoogleAuthProfile | false,
  info?: { message?: string },
) => void;

export function authenticateGoogle(
  options: { state?: string; callbackURL: string },
  callback?: GoogleAuthCallback,
) {
  const authOptions = buildGoogleAuthenticateOptions(options);
  if (callback) {
    return passport.authenticate(
      GOOGLE_STRATEGY as string,
      authOptions,
      callback,
    );
  }
  return passport.authenticate(GOOGLE_STRATEGY as string, authOptions);
}

export function setupGooglePassport(): void {
  if (!isGoogleOAuthConfigured()) return;

  passport.use(
    GOOGLE_STRATEGY,
    new GoogleStrategy(
      {
        clientID: getGoogleClientId(),
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: "/api/auth/google/callback",
        passReqToCallback: true,
        scope: ["profile", "email"],
      },
      (req, _accessToken, _refreshToken, profile, done) => {
        try {
          const stateParam =
            typeof req.query.state === "string" ? req.query.state : null;
          if (!stateParam) {
            return done(null, false, { message: "csrf" });
          }

          const state = verifyOAuthState(stateParam);
          if (!state) {
            return done(null, false, { message: "csrf" });
          }

          const googleId = profile.id;
          const email = profile.emails?.[0]?.value;
          const emailVerified = profile.emails?.[0]?.verified === true;
          const name =
            profile.displayName ||
            profile.name?.givenName ||
            email ||
            "Google User";
          const profilePicture = profile.photos?.[0]?.value;

          const result: GoogleAuthProfile = {
            googleId,
            email,
            name,
            profilePicture,
            emailVerified,
            state,
          };
          return done(null, result);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );
}
