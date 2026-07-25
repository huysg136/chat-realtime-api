import redis from "../config/redis.js";

const TYPING_TTL_SEC = 5;
const typingKey = (roomId, uid) => `typing:${roomId}`;

// đánh dấu user bắt đầu gõ trong room (score = timestamp để lọc theo thời gian)
async function startTyping({roomId, uid}){
    await redis.zadd(typingKey(roomId), { score: Date.now(), member: uid });
    return { roomId, uid, status: "start"};
}

// xóa user khỏi danh sách đang gõ trong room
async function stopTyping({roomId, uid}){
    await redis.zrem(typingKey(roomId), uid);
    return { roomId, uid, status: "stop"};
}

async function getTypingUsers({roomId, excludeUid}){
    const cutoff = Date.now() - TYPING_TTL_SEC * 1000;

    // xóa các entry cũ hơn (ai typing quá TYPING_TTL_SEC sẽ xóa khỏi list)
    await redis.zremrangebyscore(typingKey(roomId), 0, cutoff);

    // lấy danh sách ai đang typing từ lúc cutoff đến inf
    const uids = await redis.zrange(typingKey(roomId), cutoff, "+inf", {
        byScore: true,
    });

    // lọc danh sách typing trừ chính mình
    return excludeUid ? uids.filter((id) => id != excludeUid): uids;
}

export const chatService = {
    startTyping,
    stopTyping,
    getTypingUsers,
}
