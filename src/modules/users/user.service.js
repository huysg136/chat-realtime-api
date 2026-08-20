import { db } from "../../config/firebase.js";
import { getCache, setCache, CACHE_TTL } from "../../utils/cache.js";

/**
 * Lấy metadata user từ cache Redis trước, fallback Firestore.
 * Dùng query where("uid") vì document ID có thể khác uid.
 */
export const getUserData = async (uid) => {
  if (!uid) return null;

  try {
    const cacheKey = `user_metadata:${uid}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const snapshot = await db
      .collection("users")
      .where("uid", "==", uid)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const userData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    await setCache(cacheKey, userData, CACHE_TTL.USER_METADATA);
    return userData;
  } catch (error) {
    console.error("[getUserData] failed:", error);
    return null;
  }
};
