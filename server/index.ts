import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import { execSync } from "child_process";

try {
  execSync("npx prisma generate --silent", { stdio: "pipe" });
} catch {}

// ---------------------------------------------------------------------------
// Startup environment validation
// Catch missing or misconfigured env vars before the server accepts traffic.
// ---------------------------------------------------------------------------
(function validateEnv() {
  const isProdCheck = process.env.NODE_ENV === "production";

  // Required in all environments — the app cannot function without these.
  const required: string[] = [
    "DATABASE_URL",
  ];

  // Required in production — silently broken behaviour in prod without these.
  const requiredInProd: string[] = [
    "CLIENT_URL",   // CORS allowlist; without it all cross-origin requests are rejected
  ];

  // Optional vars (features degrade gracefully when absent):
  //   GOOGLE_CLIENT_ID          — Google Sign-In (disabled if missing)
  //   CLOUDINARY_CLOUD_NAME     — file uploads (disabled if missing)
  //   CLOUDINARY_API_KEY        — file uploads
  //   CLOUDINARY_API_SECRET     — file uploads
  //   SMTP_HOST                 — email delivery (disabled if missing)
  //   SMTP_PORT                 — email delivery (defaults to 587)
  //   SMTP_USER                 — email delivery
  //   SMTP_PASS                 — email delivery
  //   SUPER_ADMIN_EMAIL         — auto-promotes user to super-admin on startup
  //   ADMIN_EMAIL               — auto-promotes user to admin on startup
  //   REPLIT_DOMAINS            — added to CORS allowlist on Replit deployments

  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) missing.push(key);
  }

  if (isProdCheck) {
    for (const key of requiredInProd) {
      if (!process.env[key]) missing.push(key);
    }
  } else {
    // In development, warn but don't exit for prod-only vars.
    for (const key of requiredInProd) {
      if (!process.env[key]) {
        console.warn(`[env] WARNING: ${key} is not set. This is required in production.`);
      }
    }
  }

  if (missing.length > 0) {
    console.error(
      `[env] FATAL: The following required environment variables are missing:\n` +
      missing.map((k) => `  • ${k}`).join("\n") +
      `\nSet them before starting the server.`
    );
    process.exit(1);
  }
})();

const app = express();

// Trust the first proxy hop — required for express-rate-limit to read X-Forwarded-For correctly
// in Replit's environment (requests arrive via a reverse proxy).
app.set("trust proxy", 1);

const isProd = process.env.NODE_ENV === "production";

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com", "https://apis.google.com", "https://replit.com"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "https://accounts.google.com", "https://apis.google.com", "https://replit.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://lh3.googleusercontent.com", "https://accounts.google.com"],
      connectSrc: ["'self'", "https://accounts.google.com", "https://oauth2.googleapis.com", "https://openidconnect.googleapis.com"],
      frameSrc: ["https://accounts.google.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isProd ? [] : null,
    },
  },
  hsts: isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
  xFrameOptions: { action: "deny" },
}));

// CORS — same-origin app; only allow an exact allowlist of trusted origins.
// Wildcard suffix matching (.replit.app / .replit.dev) is intentionally removed
// because credentials:true + broad suffix matching is equivalent to open CORS.
function buildAllowedOrigins(): Set<string> {
  const origins: (string | undefined)[] = [
    "http://localhost:5000",
    "http://localhost:5001",
    // Add the canonical Replit deployment domain if provided
    process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0].trim()}`
      : undefined,
  ];

  // For each CLIENT_URL, also add the www ↔ non-www counterpart so both
  // variants are always accepted (e.g. lyraprep.com and www.lyraprep.com).
  if (process.env.CLIENT_URL) {
    const url = process.env.CLIENT_URL.trim();
    origins.push(url);
    try {
      const parsed = new URL(url);
      if (parsed.hostname.startsWith("www.")) {
        parsed.hostname = parsed.hostname.slice(4);
      } else {
        parsed.hostname = `www.${parsed.hostname}`;
      }
      origins.push(parsed.origin);
    } catch {
      // malformed URL — skip the counterpart
    }
  }

  return new Set<string>(origins.filter(Boolean) as string[]);
}

const allowedOrigins = buildAllowedOrigins();

app.use(cors({
  origin: (origin, cb) => {
    // No origin = same-origin request (server-to-server or direct navigation) — always allow.
    if (!origin || allowedOrigins.has(origin)) {
      cb(null, true);
    } else {
      cb(new Error("CORS: origin not allowed"));
    }
  },
  credentials: true,
}));

// Cookie parser (must be before routes)
app.use(cookieParser());

// Rate limiting — auth routes always limited; API limiter loosened in dev
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isProd ? 100 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

// Rate-limit only mutating auth endpoints. GET routes like /api/auth/me and
// /api/auth/verify-email/:token are exempted — they are called on every page
// load and would lock users out after just 10 navigations in 15 minutes.
// Those GET routes are still covered by the broader apiLimiter below.
app.post("/api/auth/login", authLimiter);
app.post("/api/auth/signup", authLimiter);
app.post("/api/auth/signup/student", authLimiter);
app.post("/api/auth/signup/student/google", authLimiter);
// app.post("/api/auth/google", authLimiter);
// app.get("/api/auth/google/authorize", authLimiter);
// app.get("/api/auth/google/callback", authLimiter);
app.get("/api/auth/signup/student/authorize", authLimiter);
app.post("/api/auth/google/complete", authLimiter);
app.post("/api/auth/forgot-password", authLimiter);
app.post("/api/auth/reset-password", authLimiter);
app.post("/api/auth/resend-verification", authLimiter);
// Also rate-limit invite acceptance (contains auth logic)
app.use("/api/students", authLimiter);
// Team invite acceptance contains token-based auth logic — must be rate-limited
app.use("/api/team-invite", authLimiter);
app.use("/api", apiLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enforce JSON content-type for mutating API requests (reject unexpected payloads).
// Exception: /api/auth/google/callback receives application/x-www-form-urlencoded
// from Google's GIS redirect mode — that path must be allowed through.
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  if (req.path === "/auth/google/callback") return next();
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const ct = req.headers["content-type"] ?? "";
    if (!ct.includes("application/json") && !ct.includes("multipart/form-data")) {
      return res.status(415).json({ error: "Content-Type must be application/json" });
    }
  }
  next();
});

// Add user to request
declare global {
  namespace Express {
    interface Request {
      session: {
        userId?: number;      // effective identity (impersonated user, or real user when not impersonating)
        realUserId?: number;  // actual cookie-holder (always the authenticated user)
        sessionId?: string;   // raw session token (needed to update impersonatingUserId)
      };
    }
  }
}

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = createServer(app);
  
  registerRoutes(app);

  // In development, use Vite dev middleware; in production serve the built assets
  if (process.env.NODE_ENV === "development") {
    log("Using Vite dev middleware");
    await setupVite(app, server);
  } else {
    log("Serving static files from dist/public");
    serveStatic(app);
  }
  
  // Global error handler — must be registered after all routes and static middleware.
  // Catches any error passed via next(err) and returns a clean JSON response
  // instead of Express's default HTML 500 page.
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status ?? err.statusCode ?? 500;
    const message = err.message ?? "Internal server error";
    console.error("[error]", err);
    if (!res.headersSent) {
      res.status(status).json({ error: message });
    }
  });

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`Server running on port ${PORT}`);
  });
})();
