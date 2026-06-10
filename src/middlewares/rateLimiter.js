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

// ─── Global: 200 req/min theo IP ─────────────────────────────────────────────
export const rateLimiter = createRateLimiter({
  limit: 100,
  windowMs: 60,
  prefix: "rl:global",
});

// ─── Posts ────────────────────────────────────────────────────────────────────
/** Tạo bài viết: 2 bài/phút */
export const createPostLimiter = createRateLimiter({
  limit: 2,
  windowMs: 60,
  prefix: "rl:post:create",
  message: "Bạn đăng bài quá nhanh. Vui lòng chờ một chút.",
});

/** Xóa/Sửa bài: 10 lần/phút */
export const mutatePostLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60,
  prefix: "rl:post:mutate",
});

/** Like bài / like comment: 10 lần/phút */
export const likeLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60,
  prefix: "rl:like",
});

/** Bình luận: 5 lần/phút */
export const commentLimiter = createRateLimiter({
  limit: 5,
  windowMs: 60,
  prefix: "rl:comment",
  message: "Bạn bình luận quá nhanh. Vui lòng chờ một chút.",
});

/** Xem feed: 10 lần/phút */
export const feedLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60,
  prefix: "rl:feed",
});

// ─── Friends ──────────────────────────────────────────────────────────────────
/** Gửi lời mời kết bạn: 10 lần/phút */
export const friendRequestLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60,
  prefix: "rl:friend:request",
  message: "Bạn gửi lời mời kết bạn quá nhanh. Vui lòng thử lại sau.",
});

/** Accept/Reject/Cancel/Unfriend: 10 lần/phút */
export const friendActionLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60,
  prefix: "rl:friend:action",
});

/** Notifications: 10 lần/phút */
export const notificationLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60,
  prefix: "rl:notification",
});

/** Friend suggestions: 2 lần/phút */
export const suggestionLimiter = createRateLimiter({
  limit: 2,
  windowMs: 60,
  prefix: "rl:friend:suggestion",
});

// ─── AI ───────────────────────────────────────────────────────────────────────
/** Groq / Gemini: 3 req/phút — tốn tiền, chặt nhất */
export const aiLimiter = createRateLimiter({
  limit: 3,
  windowMs: 60,
  prefix: "rl:ai",
  message: "Bạn đã dùng AI quá nhiều. Vui lòng thử lại sau 1 phút.",
});

// ─── Upload ───────────────────────────────────────────────────────────────────
/** Upload file: 1 lần/phút */
export const uploadLimiter = createRateLimiter({
  limit: 3,
  windowMs: 60,
  prefix: "rl:upload",
  message: "Bạn upload quá nhanh. Vui lòng thử lại sau.",
});

// ─── Stringee ─────────────────────────────────────────────────────────────────
/** Lấy token Stringee: 10 lần/phút */
export const stringeeTokenLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60,
  prefix: "rl:stringee:token",
});

/** Tạo/join room: 10 lần/phút */
export const stringeeRoomLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60,
  prefix: "rl:stringee:room",
});