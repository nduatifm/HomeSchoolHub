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
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com", "https://replit.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://lh3.googleusercontent.com"],
      connectSrc: ["'self'", "https://accounts.google.com"],
      frameSrc: ["https://accounts.google.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isProd ? [] : null,
    },
  },
  hsts: isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
  xFrameOptions: { action: "deny" },
}));

// CORS — same-origin app; only allow known client origins
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5000",
  process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : undefined,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin === o || origin.endsWith(".replit.app") || origin.endsWith(".replit.dev"))) {
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

app.use("/api/auth", authLimiter);
// Also rate-limit invite acceptance (contains auth logic)
app.use("/api/students", authLimiter);
app.use("/api", apiLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enforce JSON content-type for mutating API requests (reject unexpected payloads)
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
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
  
  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`Server running on port ${PORT}`);
  });
})();
