import redis from "../config/redis.js";

const rateLimitScript = `
  local count = redis.call('INCR', KEYS[1])
  local ttl = redis.call('TTL', KEYS[1])
  if ttl == -1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  return count
`;

const createRateLimiter = ({ limit = 100, windowMs = 60 }) => {
    return async (req, res, next) => {
        const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim()
            || req.socket.remoteAddress
            || "unknown";
        const key = `ratelimit:${ip}`;

        try {
            const count = await redis.eval(rateLimitScript, [key], [windowMs]);

            res.set("X-RateLimit-Limit", limit);
            res.set("X-RateLimit-Remaining", Math.max(0, limit - count));

            if (count > limit) {
                return res.status(429).json({
                    success: false,
                    message: `Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.`,
                });
            }

            next();
        } catch (error) {
            console.error(`Rate limiter error:`, error);
            next();
        }
    };
};

export const rateLimiter = createRateLimiter({ limit: 200, windowMs: 60 });