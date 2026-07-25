import express from "express";
import http from "http";
import cors from "cors";

import { config } from "./src/config/index.js";
import { globalErrorHandler } from "./src/middlewares/errorHandler.js";
import { rateLimiter } from "./src/middlewares/rateLimiter.js";
import { authMiddleware } from "./src/middlewares/authMiddleware.js";

// Routes
import stringeeRoutes from "./src/routes/stringeeRoutes.js";
import uploadRoutes from "./src/routes/uploadRoutes.js";
import aiRoutes from "./src/routes/aiRoutes.js";
import mailRoutes from "./src/routes/mailRoutes.js";
import friendsRoutes from "./src/routes/friendsRoutes.js";
import postsRoutes from "./src/routes/postsRoutes.js";
import chatRoutes from "./src/routes/chatRoutes.js"

const app = express();
const server = http.createServer(app);

const isProduction = process.env.NODE_ENV === "production";

const allowedOrigins = isProduction
  ? ["https://quik.id.vn", "https://www.quik.id.vn"]
  : [
      "http://localhost:3000",
      "https://quik.id.vn",
      "https://www.quik.id.vn",
    ];

// CORS
app.use(
  cors({
    origin(origin, callback) {
      // Cho phép request không có Origin
      // (mobile app, server-to-server, webhook...)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// rate limit
app.use(rateLimiter);

// firebase auth
app.use(authMiddleware);

// protected routes
app.use(uploadRoutes);
app.use("/api/stringee", stringeeRoutes);
app.use("/api", aiRoutes);
app.use("/api/mail", mailRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/typing", chatRoutes);

// global error handler
app.use(globalErrorHandler);

const PORT = config.port;

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});