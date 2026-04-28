import redis from "../config/redis.js";

const DEFAULT_TTL = 60 * 60 * 6; // 6 tiếng (giây)

export async function getCache(key) {
    try {
        const data = await redis.get(key);
        // Upstash có thể trả về object luôn, nhưng ta ép kiểu để an toàn 
        // nếu lỡ lưu string thô hoặc dùng client khác
        if (typeof data === 'string') return JSON.parse(data);
        return data; 
    } catch {
        return null;
    }
}

export async function setCache(key, value, ttlSeconds = DEFAULT_TTL) {
    try {
        await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
    } catch (err) {
        console.error("Redis set error:", err);
    }
}


export async function deleteCache(key) {
    try {
        await redis.del(key);
    } catch { }
}