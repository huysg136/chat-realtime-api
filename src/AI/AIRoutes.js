import express from "express";
import { aiController } from "./AIController.js";

const router = express.Router();

router.post("/ask-groq", aiController.askGroq);
router.post("/ask-gemini", aiController.askGemini);
router.get("/list-models", aiController.listModels);

export default router;
