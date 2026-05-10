import express from "express";
import { aiController } from "../controllers/aiController.js";

const router = express.Router();

router.post("/ask-groq", aiController.askGroq.bind(aiController));
router.post("/ask-gemini", aiController.askGemini.bind(aiController));
router.get("/list-models", aiController.listModels.bind(aiController));

export default router;
