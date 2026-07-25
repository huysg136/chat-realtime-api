import redis from "../config/redis.js";

/**
 * Lua script atomic: INCR + EXPIRE nếu key mới
 * Trả về số lần gọi hiện tại trong window
 */
const rateLimitScript = `
  local count = redis.call('INCR', KEYS[1])
  local ttl = redis.call('TTL', KEYS[1])
  if ttl == -1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  return count
`;

/**
 * Tạo rate limiter linh hoạt:
 * - Nếu req.user tồn tại (sau authMiddleware): key theo uid
 * - Fallback: key theo IP
 *
 * @param {object} options
 * @param {number} options.limit       - Số request tối đa trong window
 * @param {number} options.windowMs    - Window tính bằng giây
 * @param {string} options.prefix      - Prefix cho Redis key (để phân biệt endpoint)
 * @param {string} [options.message]   - Message trả về khi bị limit
 */
const createRateLimiter = ({
  limit = 100,
  windowMs = 60,
  prefix = "rl",
  message = "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.",
}) => {
  return async (req, res, next) => {
    // Ưu tiên uid (chính xác hơn IP), fallback IP
    const identifier =
      req.user?.uid ||
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket.remoteAddress ||
      "unknown";

    const key = `${prefix}:${identifier}`;

    try {
      const count = await redis.eval(rateLimitScript, [key], [windowMs]);

      res.set("X-RateLimit-Limit", limit);
      res.set("X-RateLimit-Remaining", Math.max(0, limit - count));
      res.set("X-RateLimit-Reset", Math.ceil(Date.now() / 1000) + windowMs);

      if (count > limit) {
        return res.status(429).json({
          success: false,
          message,
        });
      }

      next();
    } catch (error) {
      console.error(`[RateLimiter] Error on key "${key}":`, error.message);
      // Fail open: không block user nếu Redis lỗi
      next();
    }
  };
};

// global: 200 req/min
export const rateLimiter = createRateLimiter({
  limit: 200,
  windowMs: 60,
  prefix: "rl:global",
});

// POSTS
export const createPostLimiter = createRateLimiter({
  limit: 2,
  windowMs: 60,
  prefix: "rl:post:create",
});

export const mutatePostLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60,
  prefix: "rl:post:mutate",
});

export const likeLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60,
  prefix: "rl:like",
});

export const commentLimiter = createRateLimiter({
  limit: 5,
  windowMs: 60,
  prefix: "rl:comment",
});

export const feedLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60,
  prefix: "rl:feed",
});

// FRIENDS
export const friendRequestLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60,
  prefix: "rl:friend:request",
  message: "Bạn gửi lời mời kết bạn quá nhanh. Vui lòng thử lại sau.",
});

export const friendActionLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60,
  prefix: "rl:friend:action",
});

// NOTIFICATIONS
export const notificationLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60,
  prefix: "rl:notification",
});

// FRIEND SUGGESTION
export const suggestionLimiter = createRateLimiter({
  limit: 2,
  windowMs: 60,
  prefix: "rl:friend:suggestion",
});

// AI API
export const aiLimiter = createRateLimiter({
  limit: 3,
  windowMs: 60,
  prefix: "rl:ai",
});

// UPLOAD TO R2
export const uploadLimiter = createRateLimiter({
  limit: 3,
  windowMs: 60,
  prefix: "rl:upload",
});

// CALL VIDEO STRINGEE (GET TOKEN)
export const stringeeTokenLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60,
  prefix: "rl:stringee:token",
});

export const stringeeRoomLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60,
  prefix: "rl:stringee:room",
});

// CHAT (TYPING)
export const typingWriteLimiter = createRateLimiter({
  limit: 60,
  windowMs: 60,
  prefix: "rl:typing:write",
});

export const typingReadLimiter = createRateLimiter({
  limit: 90, 
  windowMs: 60,
  prefix: "rl:typing:read",
});