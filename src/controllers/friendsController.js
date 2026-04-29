import { db, admin } from "../config/firebase.js";
import {
  getCache,
  setCache,
  deleteCache,
  CACHE_TTL,
  incrementUnreadCount,
  decrementUnreadCount,
  setUnreadCount,
  getUnreadCountKey,
} from "../utils/cache.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Tạo pairKey chuẩn — [A,B] === [B,A] */
const makePairKey = (uid1, uid2) => [uid1, uid2].sort().join("_");

/**
 * Lấy metadata user từ cache Redis trước, fallback Firestore.
 * Dùng query where("uid") vì document ID có thể khác uid.
 */
const getUserData = async (uid) => {
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

// ─── Friend Request ───────────────────────────────────────────────────────────

export const sendFriendRequest = async (req, res) => {
  try {
    const { fromUid, toUid } = req.body;

    if (!fromUid || !toUid || fromUid === toUid) {
      return res.status(400).json({ success: false, message: "Invalid UIDs" });
    }

    // Kiểm tra đã có lời mời pending chưa
    const existing = await db
      .collection("friendRequests")
      .where("fromUid", "==", fromUid)
      .where("toUid", "==", toUid)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!existing.empty) {
      return res
        .status(200)
        .json({ success: true, requestId: existing.docs[0].id });
    }

    // Tạo lời mời mới + notification song song
    const requestRef = await db.collection("friendRequests").add({
      fromUid,
      toUid,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const sender = await getUserData(fromUid);

    await Promise.all([
      // Tạo notification cho người nhận
      db.collection("notifications").add({
        senderUid: fromUid,
        receiverUid: toUid,
        type: "friend_request",
        entityId: requestRef.id,
        senderName: sender?.displayName || "Ai đó",
        senderPhoto: sender?.photoURL || "",
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
      // Tăng badge trong Redis
      incrementUnreadCount(toUid),
      // Xóa cache gợi ý của người gửi
      deleteCache(`suggestions:${fromUid}`),
    ]);

    return res.status(201).json({ success: true, requestId: requestRef.id });
  } catch (error) {
    console.error("[sendFriendRequest] error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId, fromUid, myUid } = req.body;

    if (!requestId || !fromUid || !myUid) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const pairKey = makePairKey(fromUid, myUid);

    // Kiểm tra đã là bạn chưa (tránh duplicate)
    const existingFriend = await db
      .collection("friends")
      .where("pairKey", "==", pairKey)
      .limit(1)
      .get();

    // Cập nhật trạng thái + tạo bạn bè (nếu chưa có) song song
    await Promise.all([
      db.collection("friendRequests").doc(requestId).update({
        status: "accepted",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
      existingFriend.empty
        ? db.collection("friends").add({
          users: [fromUid, myUid].sort(),
          pairKey,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        : Promise.resolve(),
    ]);

    const me = await getUserData(myUid);

    // Gửi notification + cập nhật Redis + xóa cache song song
    await Promise.all([
      db.collection("notifications").add({
        senderUid: myUid,
        receiverUid: fromUid,
        type: "friend_accepted",
        entityId: requestId,
        senderName: me?.displayName || "Ai đó",
        senderPhoto: me?.photoURL || "",
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
      incrementUnreadCount(fromUid),
      deleteCache(`suggestions:${myUid}`),
      deleteCache(`suggestions:${fromUid}`),
      deleteCache(`friends:${myUid}`),
      deleteCache(`friends:${fromUid}`),
      deleteCache(`feed:${myUid}:main`),
      deleteCache(`feed:${fromUid}:main`),
    ]);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[acceptFriendRequest] error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectFriendRequest = async (req, res) => {
  try {
    const { requestId, myUid } = req.body;

    if (!requestId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing requestId" });
    }

    await db.collection("friendRequests").doc(requestId).update({
      status: "rejected",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (myUid) {
      await deleteCache(`suggestions:${myUid}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[rejectFriendRequest] error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelFriendRequest = async (req, res) => {
  try {
    const { fromUid, toUid } = req.body;

    if (!fromUid || !toUid) {
      return res
        .status(400)
        .json({ success: false, message: "Missing fromUid or toUid" });
    }

    // Tìm lời mời đang pending
    const snapshot = await db
      .collection("friendRequests")
      .where("fromUid", "==", fromUid)
      .where("toUid", "==", toUid)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res
        .status(404)
        .json({ success: false, message: "Friend request not found" });
    }

    const requestDoc = snapshot.docs[0];
    const receiverUid = requestDoc.data().toUid;

    // Kiểm tra notification chưa đọc tương ứng
    const notifSnapshot = await db
      .collection("notifications")
      .where("receiverUid", "==", receiverUid)
      .where("entityId", "==", requestDoc.id)
      .where("isRead", "==", false)
      .limit(1)
      .get();

    // Xóa lời mời + cache song song
    await Promise.all([
      requestDoc.ref.delete(),
      deleteCache(`suggestions:${fromUid}`),
      deleteCache(`suggestions:${toUid}`),
    ]);

    // Nếu notification chưa đọc → xóa nó và giảm badge
    if (!notifSnapshot.empty) {
      await Promise.all([
        notifSnapshot.docs[0].ref.delete(),
        decrementUnreadCount(receiverUid),
      ]);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[cancelFriendRequest] error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const unfriend = async (req, res) => {
  try {
    const { myUid, targetUid } = req.body;

    if (!myUid || !targetUid) {
      return res
        .status(400)
        .json({ success: false, message: "Missing UIDs" });
    }

    const pairKey = makePairKey(myUid, targetUid);
    const snapshot = await db
      .collection("friends")
      .where("pairKey", "==", pairKey)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res
        .status(404)
        .json({ success: false, message: "Friendship not found" });
    }

    await Promise.all([
      snapshot.docs[0].ref.delete(),
      deleteCache(`suggestions:${myUid}`),
      deleteCache(`suggestions:${targetUid}`),
      deleteCache(`friends:${myUid}`),
      deleteCache(`friends:${targetUid}`),
      deleteCache(`feed:${myUid}:main`),
      deleteCache(`feed:${targetUid}:main`),
    ]);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[unfriend] error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { uid } = req.query;

    if (!notificationId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing notificationId" });
    }

    const notifRef = db.collection("notifications").doc(notificationId);
    const notifDoc = await notifRef.get();

    if (!notifDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    // Chỉ update + decrement nếu thực sự chưa đọc
    if (!notifDoc.data().isRead) {
      await Promise.all([
        notifRef.update({ isRead: true }),
        uid ? decrementUnreadCount(uid) : Promise.resolve(),
      ]);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[markNotificationAsRead] error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ success: false, message: "Missing uid" });
    }

    const snapshot = await db
      .collection("notifications")
      .where("receiverUid", "==", uid)
      .where("isRead", "==", false)
      .get();

    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { isRead: true });
      });
      await batch.commit();
    }

    // Reset badge về 0 bất kể có doc nào không
    await setUnreadCount(uid, 0);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[markAllNotificationsAsRead] error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({ success: false, message: "Missing uid" });
    }

    // 1. Ưu tiên Redis (nhanh, rẻ)
    const cacheKey = getUnreadCountKey(uid);
    const cachedCount = await getCache(cacheKey);
    if (cachedCount !== null) {
      return res
        .status(200)
        .json({ success: true, count: Number(cachedCount) });
    }

    // 2. Fallback Firestore nếu Redis trống (hết TTL hoặc server restart)
    const snapshot = await db
      .collection("notifications")
      .where("receiverUid", "==", uid)
      .where("isRead", "==", false)
      .get();

    const count = snapshot.size;

    // 3. Đồng bộ lại Redis để lần sau không cần query Firestore
    await setUnreadCount(uid, count);

    return res.status(200).json({ success: true, count });
  } catch (error) {
    console.error("[getUnreadCount] error:", error);
    return res.status(500).json({ success: false });
  }
};

// ─── Friend Suggestions ───────────────────────────────────────────────────────

export const getFriendSuggestions = async (req, res) => {
  try {
    const { uid } = req.query;

    if (!uid) {
      return res
        .status(400)
        .json({ success: false, message: "Missing uid" });
    }

    // 1. Cache hit → trả về ngay
    const cacheKey = `suggestions:${uid}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res
        .status(200)
        .json({ success: true, suggestions: cachedData, fromCache: true });
    }

    // 2. Lấy bạn bè + pending requests song song
    const [friendsSnapshot, sentSnapshot, receivedSnapshot] =
      await Promise.all([
        db.collection("friends").where("users", "array-contains", uid).get(),
        db
          .collection("friendRequests")
          .where("fromUid", "==", uid)
          .where("status", "==", "pending")
          .get(),
        db
          .collection("friendRequests")
          .where("toUid", "==", uid)
          .where("status", "==", "pending")
          .get(),
      ]);

    const myFriends = new Set();
    friendsSnapshot.docs.forEach((doc) => {
      const other = (doc.data().users || []).find((u) => u !== uid);
      if (other) myFriends.add(other);
    });

    const sentUids = sentSnapshot.docs.map((d) => d.data().toUid);
    const receivedUids = receivedSnapshot.docs.map((d) => d.data().fromUid);
    const excludedUids = new Set([uid, ...myFriends, ...sentUids, ...receivedUids]);

    // 3. Lấy bạn-của-bạn (FoF) — giới hạn 40 để tránh quá nhiều query
    const friendsToQuery = [...myFriends].slice(0, 40);
    const fofSnapshots = await Promise.all(
      friendsToQuery.map((friendUid) =>
        db
          .collection("friends")
          .where("users", "array-contains", friendUid)
          .get()
      )
    );

    // Map uid → Set(bạn của uid đó)
    const globalFriendshipMap = new Map();
    fofSnapshots.forEach((snap) => {
      snap.docs.forEach((doc) => {
        const pair = doc.data().users || [];
        if (pair.length !== 2) return;
        const [u1, u2] = pair;
        if (!globalFriendshipMap.has(u1)) globalFriendshipMap.set(u1, new Set());
        if (!globalFriendshipMap.has(u2)) globalFriendshipMap.set(u2, new Set());
        globalFriendshipMap.get(u1).add(u2);
        globalFriendshipMap.get(u2).add(u1);
      });
    });

    // 4. Chỉ fetch các user là candidate (FoF), KHÔNG lấy toàn bộ users
    //    → tránh đọc toàn bộ collection khi user base lớn
    const candidateUids = [...globalFriendshipMap.keys()].filter(
      (u) => !excludedUids.has(u)
    );

    // 4. Nếu không đủ candidate từ FoF, lấy thêm user khác từ hệ thống làm candidate
    if (candidateUids.length < 10) {
      const allUsersSnapshot = await db.collection("users").limit(40).get();
      allUsersSnapshot.docs.forEach((doc) => {
        const uData = doc.data();
        if (uData.uid && !excludedUids.has(uData.uid) && !candidateUids.includes(uData.uid)) {
          candidateUids.push(uData.uid);
        }
      });
    }

    // Firestore "in" query giới hạn 30/chunk
    const chunks = [];
    for (let i = 0; i < candidateUids.length; i += 30) {
      chunks.push(candidateUids.slice(i, i + 30));
    }

    const userSnapshots = await Promise.all(
      chunks.map((chunk) =>
        db.collection("users").where("uid", "in", chunk).get()
      )
    );

    const candidateUsers = userSnapshots.flatMap((snap) =>
      snap.docs.map((doc) => doc.data())
    );

    // 5. Lấy rooms để tính mutual groups + message history
    const roomsSnapshot = await db
      .collection("rooms")
      .where("members", "array-contains", uid)
      .get();
    const myRooms = roomsSnapshot.docs.map((doc) => doc.data());

    // 6. Tính điểm từng candidate
    const suggestions = candidateUsers
      .filter((u) => u.displayName) // bỏ user chưa setup profile
      .map((u) => {
        // Đếm bạn chung
        const candidateFriends = globalFriendshipMap.get(u.uid) || new Set();
        let mutualCount = 0;
        candidateFriends.forEach((fUid) => {
          if (myFriends.has(fUid)) mutualCount++;
        });

        // Đếm group chung + lịch sử nhắn tin
        let mutualGroupsCount = 0;
        let hasMessaged = false;

        myRooms.forEach((room) => {
          const memberUids = Array.isArray(room.members)
            ? room.members
              .map((m) => (typeof m === "string" ? m : m?.uid))
              .filter(Boolean)
            : [];

          if (!memberUids.includes(u.uid)) return;

          if (room.type === "group") {
            mutualGroupsCount++;
          } else if (room.type === "private" && room.lastMessage) {
            hasMessaged = true;
          }
        });

        // Tính điểm
        let score = 0;
        score += mutualCount * 10;                          // bạn chung: 10đ/người
        score += Math.min(mutualGroupsCount, 3) * 4;       // group chung: 4đ, tối đa 3
        if (hasMessaged) score += 5;                        // từng nhắn tin: 5đ

        const premiumScores = { max: 4, pro: 3, lite: 2 };
        score += premiumScores[u.premiumLevel] || 0;

        const roleScores = { admin: 3, moderator: 2 };
        score += roleScores[u.role] || 0;

        score += Math.random() * 1.5; // nhiễu ngẫu nhiên nhỏ

        return {
          uid: u.uid,
          displayName: u.displayName,
          photoURL: u.photoURL,
          role: u.role,
          premiumLevel: u.premiumLevel,
          premiumUntil: u.premiumUntil,
          _score: score,
          _mutualCount: mutualCount,
        };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, 5);

    // 7. Lưu cache
    await setCache(cacheKey, suggestions, CACHE_TTL.SUGGESTIONS);

    return res.status(200).json({ success: true, suggestions });
  } catch (error) {
    console.error("[getFriendSuggestions] error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};