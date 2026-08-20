import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";

import { swaggerDocument } from "./config/swagger.js";
import { authMiddleware } from "./middlewares/authMiddleware.js";
import { globalErrorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { rateLimiter } from "./middlewares/rateLimiter.js";
import apiRouter from "./modules/index.js";

const productionOrigins = ["https://quik.id.vn", "https://www.quik.id.vn"];
const developmentOrigins = ["http://localhost:3000", ...productionOrigins];

const allowedOrigins =
  process.env.NODE_ENV === "production" ? productionOrigins : developmentOrigins;

export const createApp = () => {
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

  return app;
};

export default createApp();
