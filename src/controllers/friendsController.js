import { db, admin } from "../config/firebase.js";
import { getCache, setCache, deleteCache, CACHE_TTL, incrCache, decrCache } from "../utils/cache.js";
import { notifyUnreadCount, resetUnreadCount, decrementUnreadCount } from "../services/notificationService.js";

const getUserData = async (uid) => {
  try {
    const cacheKey = `user_metadata:${uid}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const snapshot = await db.collection("users").where("uid", "==", uid).limit(1).get();
    if (snapshot.empty) return null;

    const userData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    await setCache(cacheKey, userData, CACHE_TTL.USER_METADATA);
    return userData;
  } catch (error) {
    return null;
  }
};

export const sendFriendRequest = async (req, res) => {
  try {
    const { fromUid, toUid } = req.body;
    if (!fromUid || !toUid || fromUid === toUid) {
      return res.status(400).json({ success: false, message: "Invalid UIDs" });
    }

    const existing = await db.collection("friendRequests")
      .where("fromUid", "==", fromUid)
      .where("toUid", "==", toUid)
      .where("status", "==", "pending")
      .get();

    if (!existing.empty) {
      return res.status(200).json({ success: true, requestId: existing.docs[0].id });
    }

    const requestRef = await db.collection("friendRequests").add({
      fromUid,
      toUid,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const sender = await getUserData(fromUid);

    await db.collection("notifications").add({
      senderUid: fromUid,
      receiverUid: toUid,
      type: "friend_request",
      entityId: requestRef.id,
      senderName: sender?.displayName || "Ai đó",
      senderPhoto: sender?.photoURL || "",
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // INCR số thông báo chưa đọc + Gửi Socket
    await notifyUnreadCount(req.app.get("io"), toUid);

    // Invalidate Cache cho người gửi
    await deleteCache(`suggestions:${fromUid}`);

    res.status(201).json({ success: true, requestId: requestRef.id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId, fromUid, myUid } = req.body;
    if (!requestId || !fromUid || !myUid) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    await db.collection("friendRequests").doc(requestId).update({
      status: "accepted",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const pairKey = [fromUid, myUid].sort().join("_");
    const existingFriend = await db.collection("friends").where("pairKey", "==", pairKey).get();

    if (existingFriend.empty) {
      await db.collection("friends").add({
        users: [fromUid, myUid].sort(),
        pairKey,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const me = await getUserData(myUid);

    await db.collection("notifications").add({
      senderUid: myUid,
      receiverUid: fromUid,
      type: "friend_accepted",
      entityId: requestId,
      senderName: me?.displayName || "Ai đó",
      senderPhoto: me?.photoURL || "",
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // INCR số thông báo chưa đọc + Gửi Socket
    await notifyUnreadCount(req.app.get("io"), fromUid);

    // Invalidate Cache
    await Promise.all([
      deleteCache(`suggestions:${myUid}`),
      deleteCache(`suggestions:${fromUid}`),
      deleteCache(`friends:${myUid}`),
      deleteCache(`friends:${fromUid}`),
      deleteCache(`feed:${myUid}:main`),
      deleteCache(`feed:${fromUid}:main`),
    ]);

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) {
      return res.status(400).json({ success: false, message: "Missing requestId" });
    }

    await db.collection("friendRequests").doc(requestId).update({
      status: "rejected",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Invalidate Cache cho người từ chối (người nhận lời mời cũ)
    const { myUid } = req.body;
    if (myUid) await deleteCache(`suggestions:${myUid}`);

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelFriendRequest = async (req, res) => {
  try {
    const { fromUid, toUid } = req.body;
    const snapshot = await db.collection("friendRequests")
      .where("fromUid", "==", fromUid)
      .where("toUid", "==", toUid)
      .where("status", "==", "pending")
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    await db.collection("friendRequests").doc(snapshot.docs[0].id).delete();

    // Invalidate Cache cho người gửi và người nhận
    await Promise.all([
      deleteCache(`suggestions:${fromUid}`),
      deleteCache(`suggestions:${toUid}`)
    ]);

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const unfriend = async (req, res) => {
  try {
    const { myUid, targetUid } = req.body;
    const pairKey = [myUid, targetUid].sort().join("_");
    const snapshot = await db.collection("friends").where("pairKey", "==", pairKey).get();

    if (snapshot.empty) {
      return res.status(404).json({ success: false, message: "Friendship not found" });
    }

    await db.collection("friends").doc(snapshot.docs[0].id).delete();

    // Invalidate Cache
    await Promise.all([
      deleteCache(`suggestions:${myUid}`),
      deleteCache(`suggestions:${targetUid}`),
      deleteCache(`friends:${myUid}`),
      deleteCache(`friends:${targetUid}`),
      deleteCache(`feed:${myUid}:main`),
      deleteCache(`feed:${targetUid}:main`),
    ]);

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { uid } = req.query; // Nhận uid từ frontend

    await db.collection("notifications").doc(notificationId).update({
      isRead: true,
    });

    // Giảm số lượng trong Redis + Gửi Socket
    if (uid) {
      await decrementUnreadCount(req.app.get("io"), uid);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const { uid } = req.body;
    const snapshot = await db.collection("notifications")
      .where("receiverUid", "==", uid)
      .where("isRead", "==", false)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { isRead: true });
    });
    await batch.commit();

    // Reset số lượng trong Redis về 0 + Gửi Socket
    await resetUnreadCount(req.app.get("io"), uid);

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ success: false });

    const cacheKey = `unread_count:${uid}`;
    let count = await getCache(cacheKey);

    // Nếu Redis chưa có (null), query Firestore lần đầu
    if (count === null) {
      const snapshot = await db.collection("notifications")
        .where("receiverUid", "==", uid)
        .where("isRead", "==", false)
        .get();
      
      count = snapshot.size;
      // Lưu lại vào Redis
      await setCache(cacheKey, count, 86400); // 24h
    }

    res.status(200).json({ success: true, count: parseInt(count) || 0 });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

export const getFriendSuggestions = async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) {
      return res.status(400).json({ success: false, message: "Missing uid" });
    }

    // 1. Check Cache first
    const cacheKey = `suggestions:${uid}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.status(200).json({ success: true, suggestions: cachedData, fromCache: true });
    }

    // 2. Get my friends
    const friendsSnapshot = await db.collection("friends").where("users", "array-contains", uid).get();
    const myFriends = new Set();
    friendsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const other = data.users.find((u) => u !== uid);
      if (other) myFriends.add(other);
    });

    // 2. Get pending requests (sent and received) to exclude
    const sentSnapshot = await db.collection("friendRequests")
      .where("fromUid", "==", uid)
      .where("status", "==", "pending")
      .get();
    const sentUids = sentSnapshot.docs.map(doc => doc.data().toUid);

    const receivedSnapshot = await db.collection("friendRequests")
      .where("toUid", "==", uid)
      .where("status", "==", "pending")
      .get();
    const receivedUids = receivedSnapshot.docs.map(doc => doc.data().fromUid);

    const excludedUids = new Set([uid, ...myFriends, ...sentUids, ...receivedUids]);

    // 3. Optimized: Only get friendships of current friends (Friend-of-Friends)
    const friendsToQuery = [...myFriends].slice(0, 40); // Limit to 40 to stay safe with Promise.all
    const fofSnapshots = await Promise.all(
      friendsToQuery.map(friendUid =>
        db.collection("friends").where("users", "array-contains", friendUid).get()
      )
    );

    const globalFriendshipMap = new Map();
    fofSnapshots.forEach((snap) => {
      snap.docs.forEach((doc) => {
        const pair = doc.data().users || [];
        if (pair.length === 2) {
          const [u1, u2] = pair;
          if (!globalFriendshipMap.has(u1)) globalFriendshipMap.set(u1, new Set());
          if (!globalFriendshipMap.has(u2)) globalFriendshipMap.set(u2, new Set());
          globalFriendshipMap.get(u1).add(u2);
          globalFriendshipMap.get(u2).add(u1);
        }
      });
    });

    // 4. Get my rooms to check for mutual groups and messaging history
    const roomsSnapshot = await db.collection("rooms").where("members", "array-contains", uid).get();
    const myRooms = roomsSnapshot.docs.map(doc => doc.data());

    // 5. Get all users
    const usersSnapshot = await db.collection("users").get();
    const allUsers = usersSnapshot.docs.map(doc => doc.data());

    // 6. Calculate scores
    const suggestions = allUsers
      .filter(u => !excludedUids.has(u.uid) && u.displayName)
      .map(u => {
        const candidateFriends = globalFriendshipMap.get(u.uid) || new Set();
        let mutualCount = 0;
        candidateFriends.forEach(f_uid => {
          if (myFriends.has(f_uid)) {
            mutualCount++;
          }
        });

        let mutualGroupsCount = 0;
        let hasMessaged = false;

        myRooms.forEach(room => {
          const memberUids = Array.isArray(room.members)
            ? room.members.map((m) => (typeof m === "string" ? m : m?.uid)).filter(Boolean)
            : [];

          if (memberUids.includes(u.uid)) {
            if (room.type === 'group') {
              mutualGroupsCount++;
            } else if (room.type === 'private' && room.lastMessage) {
              hasMessaged = true;
            }
          }
        });

        let score = 0;
        // 1. Mutual friends (10 points each)
        score += mutualCount * 10;
        // 2. Mutual groups (4 points each, capped at 3)
        const cappedGroups = Math.min(mutualGroupsCount, 3);
        score += cappedGroups * 4;
        // 3. Message history (5 points)
        if (hasMessaged) score += 5;

        // 4. Premium priority
        const premiumScores = { max: 4, pro: 3, lite: 2 };
        score += premiumScores[u.premiumLevel] || 0;

        // 5. System role
        const roleScores = { admin: 3, moderator: 2 };
        score += roleScores[u.role] || 0;

        // 6. Random noise
        score += Math.random() * 1.5;

        return {
          uid: u.uid,
          displayName: u.displayName,
          photoURL: u.photoURL,
          role: u.role,
          premiumLevel: u.premiumLevel,
          premiumUntil: u.premiumUntil,
          _score: score,
          _mutualCount: mutualCount
        };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, 5);

    // 7. Save to Cache
    await setCache(cacheKey, suggestions, CACHE_TTL.SUGGESTIONS);

    res.status(200).json({ success: true, suggestions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

