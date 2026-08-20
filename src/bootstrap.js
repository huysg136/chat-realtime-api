import express from "express";

export const bootstrapApi = async (setStage = () => {}) => {
  setStage("config");
  const { config } = await import("./config/index.js");

  setStage("firebase");
  const { firebaseReady } = await import("./config/firebase.js");

  setStage("swagger");
  const [{ default: swaggerUi }, { swaggerDocument }] = await Promise.all([
    import("swagger-ui-express"),
    import("./config/swagger.js"),
  ]);

  setStage("middlewares");
  const [authModule, errorModule, rateLimitModule] = await Promise.all([
    import("./middlewares/authMiddleware.js"),
    import("./middlewares/errorHandler.js"),
    import("./middlewares/rateLimiter.js"),
  ]);

  setStage("routes");
  const { default: apiRouter } = await import("./modules/index.js");

  const router = express.Router();

  router.get("/api-docs.json", (req, res) => res.json(swaggerDocument));
  router.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customSiteTitle: "Quik API Documentation",
      swaggerOptions: { persistAuthorization: true },
    }),
  );

  router.use(rateLimitModule.rateLimiter);
  router.use(authModule.authMiddleware);
  router.use(apiRouter);
  router.use(errorModule.notFoundHandler);
  router.use(errorModule.globalErrorHandler);

  return {
    router,
    config,
    firebaseReady,
    getAuthDiagnostic: authModule.getAuthDiagnostic,
  };
};
