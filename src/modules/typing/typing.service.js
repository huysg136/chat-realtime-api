import redis from "../../config/redis.js";

const TYPING_TTL_SECONDS = 5;
const getTypingKey = (roomId) => `typing:${roomId}`;

export const createTypingService = (redisClient) => ({
  async startTyping({ roomId, uid }) {
    await redisClient.zadd(getTypingKey(roomId), {
      score: Date.now(),
      member: uid,
    });

    return { roomId, uid, status: "start" };
  },

  async stopTyping({ roomId, uid }) {
    await redisClient.zrem(getTypingKey(roomId), uid);
    return { roomId, uid, status: "stop" };
  },

  async getTypingUsers({ roomId, excludeUid }) {
    const cutoff = Date.now() - TYPING_TTL_SECONDS * 1000;
    const key = getTypingKey(roomId);

    await redisClient.zremrangebyscore(key, 0, cutoff);

    const uids = await redisClient.zrange(key, cutoff, "+inf", {
      byScore: true,
    });

    return excludeUid ? uids.filter((uid) => uid !== excludeUid) : uids;
  },
});

export const typingService = createTypingService(redis);
