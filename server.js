import express from "express";
import http from "http";
import cors from "cors";
import { config } from "./src/config/index.js";
import { globalErrorHandler } from "./src/middlewares/errorHandler.js";
import { rateLimiter } from "./src/middlewares/rateLimiter.js";
import { authMiddleware } from "./src/middlewares/authMiddleware.js";

const app = express();
const server = http.createServer(app);

// routes
import stringeeRoutes from "./src/routes/stringeeRoutes.js";
import uploadRoutes from "./src/routes/uploadRoutes.js";
import aiRoutes from "./src/routes/aiRoutes.js";
import mailRoutes from "./src/routes/mailRoutes.js";
import friendsRoutes from "./src/routes/friendsRoutes.js";
import postsRoutes from "./src/routes/postsRoutes.js";

const isProduction = process.env.NODE_ENV === "production";

const allowedOrigins = isProduction
  ? ["https://quik.id.vn", "https://www.quik.id.vn"]
  : ["http://localhost:3000", "https://quik.id.vn", "https://www.quik.id.vn"];

const blockedUserAgents = ["postman", "insomnia", "curl", "httpie", "wget", "paw"];

// ─── Layer 1: Chặn request không có Origin hoặc từ tool test API ─────────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const userAgent = (req.headers["user-agent"] || "").toLowerCase();

  const isBlockedAgent = blockedUserAgents.some((agent) =>
    userAgent.includes(agent)
  );

  if (isBlockedAgent) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  // Bỏ qua check origin với OPTIONS (preflight request của browser)
  if (req.method === "OPTIONS") {
    return next();
  }

  if (!origin) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  next();
});

// ─── Layer 2: CORS ────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(new Error("Not allowed: missing origin"));
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// ─── Layer 3: Body parser ─────────────────────────────────────────────────────
app.use(express.json());

// ─── Layer 4: Rate Limiter ────────────────────────────────────────────────────
app.use(rateLimiter);

// ─── Layer 5: Firebase Auth ───────────────────────────────────────────────────
app.use(authMiddleware);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/stringee", stringeeRoutes);
app.use(uploadRoutes);
app.use("/api", aiRoutes);
app.use("/api/mail", mailRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/posts", postsRoutes);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(globalErrorHandler);

const PORT = config.port;
server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});