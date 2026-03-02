import { config } from "../config/index.js";
import { AppError } from "../utils/AppError.js";

export class AIService {
    async askGroq(prompt) {
        if (!prompt) throw new AppError("Missing prompt", 400);

        const API_KEY = config.ai.groqApiKey;

        // Ưu tiên từ cao xuống thấp
        const models = [
            "meta-llama/llama-4-maverick-17b-128e-instruct", // Llama 4 mạnh nhất
            "meta-llama/llama-4-scout-17b-16e-instruct",     // Llama 4 nhẹ hơn
            "llama-3.3-70b-versatile",                        // Llama 3.3 70b
            "llama-3.1-8b-instant",                           // Fallback cuối
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

                // Rate limit hoặc hết quota → thử model tiếp
                if (response.status === 429) {
                    continue;
                }

                const data = await response.json();

                // Model báo lỗi (ví dụ hết token ngày) → thử tiếp
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

        throw new AppError("All Groq models exhausted", 429);
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
