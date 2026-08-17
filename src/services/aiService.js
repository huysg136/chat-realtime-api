import { config } from "../config/index.js";
import { AppError } from "../utils/AppError.js";

export class AIService {
    async askGroq(prompt) {
        if (!prompt) throw new AppError("Missing prompt", 400);

        const API_KEY = config.ai.groqApiKey;

        // Ưu tiên các model Groq chuẩn
        const models = [
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
        ];

        for (const model of models) {
            try {
                const response = await fetch(
                    "https://api.groq.com/openai/v1/chat/completions",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${API_KEY}`
                        },
                        body: JSON.stringify({
                            model,
                            messages: [{ role: "user", content: prompt }]
                        })
                    }
                );

                if (response.status === 429) {
                    continue;
                }

                const data = await response.json();

                if (data.error) {
                    continue;
                }

                const answer = data.choices?.[0]?.message?.content;
                if (!answer) continue;

                return { answer };

            } catch (err) {
                continue;
            }
        }

        // Nếu tất cả model Groq bị limit 429 hoặc lỗi -> Tự động Fallback sang Google Gemini
        console.warn("[AIService] Groq API rate limited/failed. Falling back to Gemini...");
        try {
            return await this.askGemini(prompt);
        } catch (geminiErr) {
            console.error("[AIService] Gemini fallback also failed:", geminiErr.message);
            throw new AppError("AI service temporarily unavailable (Rate limit)", 429);
        }
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
