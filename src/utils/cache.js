import redis from "../config/redis.js";

const DEFAULT_TTL = 60 * 60 * 6; // 6 tiếng

export const CACHE_TTL = {
    USER_METADATA: 600,       // 10 phút
    FRIENDS_LIST: 600,        // 10 phút
    FEED_MAIN: 180,           // 3 phút
    SUGGESTIONS: 3600,        // 1 giờ
    GLOBAL_TIMESTAMP: 86400,  // 24 giờ
};

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

export async function getMultipleCache(keys) {
    try {
        if (!keys || keys.length === 0) return [];
        const results = await redis.mget(...keys);
        return results.map(item => {
            if (typeof item === 'string') {
                try {
                    return JSON.parse(item);
                } catch {
                    return item;
                }
            }
            return item;
        });
    } catch {
        return keys.map(() => null);
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
