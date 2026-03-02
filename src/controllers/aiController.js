import { aiService } from "../services/aiService.js";

export class AIController {
    async askGroq(req, res, next) {
        try {
            const { prompt } = req.body;
            const result = await aiService.askGroq(prompt);
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    async askGemini(req, res, next) {
        try {
            const { prompt } = req.body;
            const result = await aiService.askGemini(prompt);
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
