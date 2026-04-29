import redis from "../config/redis.js";

const DEFAULT_TTL = 60 * 60 * 6; // 6 tiếng

export const CACHE_TTL = {
    USER_METADATA: 600,       // 10 phút
    FRIENDS_LIST: 600,        // 10 phút
    FEED_MAIN: 180,           // 3 phút
    SUGGESTIONS: 3600,        // 1 giờ
    GLOBAL_TIMESTAMP: 86400,  // 24 giờ
    NOTIFICATION_COUNT: 86400 * 7, // 7 ngày
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

// --- Các hàm hỗ trợ Đếm số (Counter) ---

export async function incrCache(key) {
    try {
        return await redis.incr(key);
    } catch (err) {
        console.error("Redis incr error:", err);
        return null;
    }
}

export async function decrCache(key) {
    try {
        return await redis.decr(key);
    } catch (err) {
        console.error("Redis decr error:", err);
        return null;
    }
}

// --- Notification Specific Helpers ---

export const getUnreadCountKey = (uid) => `unread_count:${uid}`;

export async function incrementUnreadCount(uid) {
    if (!uid) return;
    const key = getUnreadCountKey(uid);
    try {
        const count = await redis.incr(key);
        // Reset TTL to 7 days on every increment
        await redis.expire(key, CACHE_TTL.NOTIFICATION_COUNT);
        return count;
    } catch (err) {
        console.error("Redis incrementUnreadCount error:", err);
    }
}

export async function decrementUnreadCount(uid) {
    if (!uid) return;
    const key = getUnreadCountKey(uid);
    try {
        let count = await redis.decr(key);
        if (count < 0) {
            await redis.set(key, 0, { ex: CACHE_TTL.NOTIFICATION_COUNT });
            count = 0;
        }
        return count;
    } catch (err) {
        console.error("Redis decrementUnreadCount error:", err);
    }
}

export async function setUnreadCount(uid, count) {
    if (!uid) return;
    const key = getUnreadCountKey(uid);
    try {
        await redis.set(key, count, { ex: CACHE_TTL.NOTIFICATION_COUNT });
    } catch (err) {
        console.error("Redis setUnreadCount error:", err);
    }
}
