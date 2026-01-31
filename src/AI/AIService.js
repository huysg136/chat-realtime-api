import { config } from "../Config/index.js";
import { AppError } from "../Exception/globalErrorHandler.js";

export class AIService {
    async askGroq(prompt) {
        if (!prompt) throw new AppError("Missing prompt", 400);

        const API_KEY = config.ai.groqApiKey;

        const response = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: "llama-3.1-8b-instant",
                    messages: [{ role: "user", content: prompt }]
                })
            }
        );

        if (response.status === 429) {
            throw new AppError("Rate limit exceeded", 429);
        }

        const data = await response.json();

        if (data.error) {
            throw new AppError(data.error.message || "API_ERROR", 400);
        }

        const answer = data.choices?.[0]?.message?.content;

        if (!answer) {
            throw new AppError("No response from Groq", 500);
        }

        return { answer };
    }

    async askGemini(prompt) {
        if (!prompt) throw new AppError("Missing prompt", 400);

        const API_KEY = config.ai.geminiApiKey;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            throw new AppError(data.error.message, 400);
        }

        const answer = data.candidates?.[0]?.content?.parts
            ?.map(p => p.text)
            .join("\n");

        if (!answer) throw new AppError("No response from Gemini", 500);

        return { answer };
    }

    async listModels() {
        const API_KEY = config.ai.geminiApiKey;
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
        );
        const data = await response.json();
        return data;
    }
}

export const aiService = new AIService();
