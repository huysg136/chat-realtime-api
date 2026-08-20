import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";

import { config } from "./src/config/index.js";
import { firebaseReady } from "./src/config/firebase.js";
import { swaggerDocument } from "./src/config/swagger.js";
import {
  authMiddleware,
  getAuthDiagnostic,
} from "./src/middlewares/authMiddleware.js";
import {
  globalErrorHandler,
  notFoundHandler,
} from "./src/middlewares/errorHandler.js";
import { rateLimiter } from "./src/middlewares/rateLimiter.js";
import apiRouter from "./src/modules/index.js";

const productionOrigins = ["https://quik.id.vn", "https://www.quik.id.vn"];
const developmentOrigins = ["http://localhost:3000", ...productionOrigins];
const allowedOrigins =
  process.env.NODE_ENV === "production" ? productionOrigins : developmentOrigins;

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.json({
    status: firebaseReady ? "ok" : "degraded",
    services: { firebase: firebaseReady ? "configured" : "not_configured" },
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    ...(process.env.NODE_ENV !== "production" && {
      lastAuthDiagnostic: getAuthDiagnostic(),
    }),
  });
});

app.get("/api-docs.json", (req, res) => res.json(swaggerDocument));
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customSiteTitle: "Quik API Documentation",
    swaggerOptions: { persistAuthorization: true },
  }),
);

app.use(rateLimiter);
app.use(authMiddleware);
app.use(apiRouter);

app.use(notFoundHandler);
app.use(globalErrorHandler);

if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`Server started on port ${config.port}`);
  });
}

export default app;
