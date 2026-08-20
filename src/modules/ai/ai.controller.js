import { aiService } from "./ai.service.js";

export class AIController {
    async askGroq(req, res, next) {
        try {
            const { prompt } = req.body;
            if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
                return res.status(400).json({ success: false, message: "prompt is required" });
            }
            if (prompt.length > 10000) {
                return res.status(400).json({ success: false, message: "prompt too long (max 10000 chars)" });
            }
            const result = await aiService.askGroq(prompt.trim());
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    async askGemini(req, res, next) {
        try {
            const { prompt } = req.body;
            if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
                return res.status(400).json({ success: false, message: "prompt is required" });
            }
            if (prompt.length > 10000) {
                return res.status(400).json({ success: false, message: "prompt too long (max 10000 chars)" });
            }
            const result = await aiService.askGemini(prompt.trim());
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    async listModels(req, res, next) {
        try {
            const result = await aiService.listModels();
            res.json(result);
        } catch (err) {
            next(err);
        }
    }
}

export const aiController = new AIController();
