import express from "express";
import http from "http";
import cors from "cors";
import { config } from "./src/config/index.js";
import { globalErrorHandler } from "./src/middlewares/errorHandler.js";
import { rateLimiter } from "./src/middlewares/rateLimiter.js";
import { apiKeyAuth } from "./src/middlewares/apiKeyAuth.js";

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

app.use(
  cors({
    origin: (origin, callback) => {
      // Không cho phép request không có Origin (Postman, curl, server-to-server)
      if (origin && allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json());
app.use(rateLimiter);
app.use(apiKeyAuth); // Chặn mọi request không có x-api-key hợp lệ
// routes
app.use("/api/stringee", stringeeRoutes);
app.use(uploadRoutes);
app.use("/api", aiRoutes);
app.use("/api/mail", mailRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/posts", postsRoutes);

app.use(globalErrorHandler);

const PORT = config.port;
server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
