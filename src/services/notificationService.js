import { incrCache, decrCache, setCache } from "../utils/cache.js";

export const notifyUnreadCount = async (io, uid) => {
    try {
        if (!io) return;
        // 1. Tăng số lượng trong Redis
        const newCount = await incrCache(`unread_count:${uid}`);
        
        // 2. Gửi tín hiệu Socket đến user đó
        if (newCount !== null) {
            io.to(uid).emit("unread_count_update", { count: parseInt(newCount) });
            console.log(`[Socket] Pushed unread count ${newCount} to user ${uid}`);
        }
    } catch (error) {
        console.error("Error in notifyUnreadCount service:", error);
    }
};

export const resetUnreadCount = async (io, uid) => {
    try {
        if (!io) return;
        await setCache(`unread_count:${uid}`, 0);
        io.to(uid).emit("unread_count_update", { count: 0 });
    } catch (error) {
        console.error("Error in resetUnreadCount service:", error);
    }
};

export const decrementUnreadCount = async (io, uid) => {
    try {
        if (!io) return;
        const newCount = await decrCache(`unread_count:${uid}`);
        if (newCount !== null) {
            io.to(uid).emit("unread_count_update", { count: Math.max(0, parseInt(newCount)) });
        }
    } catch (error) {
        console.error("Error in decrementUnreadCount service:", error);
    }
};
