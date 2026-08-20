import cors from "cors";
import express from "express";

import { bootstrapApi } from "./src/bootstrap.js";

const productionOrigins = ["https://quik.id.vn", "https://www.quik.id.vn"];
const developmentOrigins = ["http://localhost:3000", ...productionOrigins];
const allowedOrigins =
  process.env.NODE_ENV === "production" ? productionOrigins : developmentOrigins;

const app = express();
let runtime = null;
let startup = { status: "idle", stage: "not_started" };
let bootstrapPromise = null;

const initializeRuntime = async () => {
  if (runtime || startup.status === "failed") return runtime;

  if (!bootstrapPromise) {
    startup = { status: "starting", stage: "bootstrap" };
    bootstrapPromise = bootstrapApi((stage) => {
      startup = { status: "starting", stage };
    })
      .then((initializedRuntime) => {
        runtime = initializedRuntime;
        startup = { status: "ok", stage: "ready" };
        return runtime;
      })
      .catch((error) => {
        startup = {
          status: "failed",
          stage: startup.stage,
          error: {
            name: error.name,
            code: error.code ?? null,
            message: error.message,
          },
        };
        console.error(`[startup:${startup.stage}]`, error);
        return null;
      });
  }

  return bootstrapPromise;
};

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

app.get("/api/health", async (req, res) => {
  await initializeRuntime();
  const healthy = startup.status === "ok";

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "error",
    startup,
    services: {
      firebase: runtime?.firebaseReady ? "configured" : "not_configured",
    },
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    ...(process.env.NODE_ENV !== "production" && {
      lastAuthDiagnostic: runtime?.getAuthDiagnostic?.() ?? null,
    }),
  });
});

app.use(async (req, res, next) => {
  await initializeRuntime();

  if (!runtime) {
    return res.status(503).json({
      success: false,
      code: "APPLICATION_STARTUP_FAILED",
      message: "The API failed to initialize.",
    });
  }

  return runtime.router(req, res, next);
});

if (!process.env.VERCEL) {
  app.listen(process.env.PORT || 8080, () => {
    console.log(`Server started on port ${process.env.PORT || 8080}`);
  });
}

export default app;
