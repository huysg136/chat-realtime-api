import express from "express";
import { aiController } from "./ai.controller.js";
import { aiLimiter } from "../../middlewares/rateLimiter.js";

const router = express.Router();

// AI endpoints: 10/min — tốn tiền, chặt nhất
router.post("/ask-groq", aiLimiter, aiController.askGroq.bind(aiController));
router.post("/ask-gemini", aiLimiter, aiController.askGemini.bind(aiController));
router.get("/list-models", aiLimiter, aiController.listModels.bind(aiController));

export default router;
