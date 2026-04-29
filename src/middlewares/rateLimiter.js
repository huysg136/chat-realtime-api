import redis from "../config/redis.js";

export const createRateLimiter = ({ limit = 100, windowMs = 60, prefix = "global" }) => {
    return async (req, res, next) => {
        const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim()
            || req.socket.remoteAddress
            || "unknown";
        const key = `ratelimit:${prefix}:${ip}`;

        try {
            const count = await redis.incr(key);
            if (count === 1) {
                await redis.expire(key, windowMs);
            }

            if (count > limit) {
                return res.status(429).json({
                    success: false,
                    message: `Bạn đã gửi quá nhiều yêu cầu đến ${prefix}. Vui lòng thử lại sau.`,
                });
            }

            next();
        } catch (error) {
            console.error(`Rate limiter (${prefix}) error:`, error);
            next();
        }
    };
};

export const globalLimiter = createRateLimiter({ limit: 200, windowMs: 60, prefix: "global" });
export const aiLimiter = createRateLimiter({ limit: 20, windowMs: 60, prefix: "ai" });
export const stringeeLimiter = createRateLimiter({ limit: 20, windowMs: 60, prefix: "stringee" });
export const uploadLimiter = createRateLimiter({ limit: 5, windowMs: 60, prefix: "upload" });
export const friendsLimiter = createRateLimiter({ limit: 30, windowMs: 60, prefix: "friends" });
export const postsLimiter = createRateLimiter({ limit: 30, windowMs: 60, prefix: "posts" });
export const mailLimiter = createRateLimiter({ limit: 15, windowMs: 60, prefix: "mail" });