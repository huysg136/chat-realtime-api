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
import { getUserData } from "./userService.js";
import { AppError } from "../utils/AppError.js";

const makePairKey = (uid1, uid2) => [uid1, uid2].sort().join("_");

export class FriendService {
  async sendFriendRequest(fromUid, toUid) {
    if (!toUid || fromUid === toUid) {
      throw new AppError("Invalid UIDs", 400);
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
      return { requestId: existing.docs[0].id };
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
      incrementUnreadCount(toUid),
      deleteCache(`suggestions:${fromUid}`),
    ]);

    return { requestId: requestRef.id };
  }

  async acceptFriendRequest(myUid, requestId, fromUid) {
    if (!requestId || !fromUid) {
      throw new AppError("Missing required fields", 400);
    }

    const requestDoc = await db.collection("friendRequests").doc(requestId).get();
    if (!requestDoc.exists) {
      throw new AppError("Friend request not found", 404);
    }
    if (requestDoc.data().toUid !== myUid) {
      throw new AppError("Forbidden", 403);
    }

    const pairKey = makePairKey(fromUid, myUid);

    const existingFriend = await db
      .collection("friends")
      .where("pairKey", "==", pairKey)
      .limit(1)
      .get();

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

    return { success: true };
  }

  async rejectFriendRequest(myUid, requestId) {
    if (!requestId) {
      throw new AppError("Missing requestId", 400);
    }

    const requestDoc = await db.collection("friendRequests").doc(requestId).get();
    if (!requestDoc.exists) {
      throw new AppError("Friend request not found", 404);
    }
    if (requestDoc.data().toUid !== myUid) {
      throw new AppError("Forbidden", 403);
    }

    await Promise.all([
      db.collection("friendRequests").doc(requestId).update({
        status: "rejected",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
      deleteCache(`suggestions:${myUid}`),
    ]);

    return { success: true };
  }

  async cancelFriendRequest(fromUid, toUid) {
    if (!toUid) {
      throw new AppError("Missing toUid", 400);
    }

    const snapshot = await db
      .collection("friendRequests")
      .where("fromUid", "==", fromUid)
      .where("toUid", "==", toUid)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new AppError("Friend request not found", 404);
    }

    const requestDoc = snapshot.docs[0];
    const receiverUid = requestDoc.data().toUid;

    const notifSnapshot = await db
      .collection("notifications")
      .where("receiverUid", "==", receiverUid)
      .where("entityId", "==", requestDoc.id)
      .where("isRead", "==", false)
      .limit(1)
      .get();

    await Promise.all([
      requestDoc.ref.delete(),
      deleteCache(`suggestions:${fromUid}`),
      deleteCache(`suggestions:${toUid}`),
    ]);

    if (!notifSnapshot.empty) {
      await Promise.all([
        notifSnapshot.docs[0].ref.delete(),
        decrementUnreadCount(receiverUid),
      ]);
    }

    return { success: true };
  }

  async unfriend(myUid, targetUid) {
    if (!targetUid) {
      throw new AppError("Missing targetUid", 400);
    }

    const pairKey = makePairKey(myUid, targetUid);
    const snapshot = await db
      .collection("friends")
      .where("pairKey", "==", pairKey)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new AppError("Friendship not found", 404);
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

    return { success: true };
  }

  async markNotificationAsRead(uid, notificationId) {
    if (!notificationId) {
      throw new AppError("Missing notificationId", 400);
    }

    const notifRef = db.collection("notifications").doc(notificationId);
    const notifDoc = await notifRef.get();

    if (!notifDoc.exists) {
      throw new AppError("Notification not found", 404);
    }

    if (notifDoc.data().receiverUid !== uid) {
      throw new AppError("Forbidden", 403);
    }

    if (!notifDoc.data().isRead) {
      await Promise.all([
        notifRef.update({ isRead: true }),
        decrementUnreadCount(uid),
      ]);
    }

    return { success: true };
  }

  async markAllNotificationsAsRead(uid) {
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

    await setUnreadCount(uid, 0);

    return { success: true };
  }

  async getUnreadCount(uid) {
    const cacheKey = getUnreadCountKey(uid);
    const cachedCount = await getCache(cacheKey);
    if (cachedCount !== null) {
      return { count: Number(cachedCount) };
    }

    const snapshot = await db
      .collection("notifications")
      .where("receiverUid", "==", uid)
      .where("isRead", "==", false)
      .get();

    const count = snapshot.size;

    await setUnreadCount(uid, count);

    return { count };
  }

  async getFriendSuggestions(uid) {
    const cacheKey = `suggestions:${uid}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return { suggestions: cachedData, fromCache: true };
    }

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

    const friendsToQuery = [...myFriends].slice(0, 40);
    const fofSnapshots = await Promise.all(
      friendsToQuery.map((friendUid) =>
        db
          .collection("friends")
          .where("users", "array-contains", friendUid)
          .get()
      )
    );

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

    const candidateUids = [...globalFriendshipMap.keys()].filter(
      (u) => !excludedUids.has(u)
    );

    if (candidateUids.length < 10) {
      const allUsersSnapshot = await db.collection("users").limit(40).get();
      allUsersSnapshot.docs.forEach((doc) => {
        const uData = doc.data();
        if (uData.uid && !excludedUids.has(uData.uid) && !candidateUids.includes(uData.uid)) {
          candidateUids.push(uData.uid);
        }
      });
    }

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

    const roomsSnapshot = await db
      .collection("rooms")
      .where("members", "array-contains", uid)
      .get();
    const myRooms = roomsSnapshot.docs.map((doc) => doc.data());

    const suggestions = candidateUsers
      .filter((u) => u.displayName)
      .map((u) => {
        const candidateFriends = globalFriendshipMap.get(u.uid) || new Set();
        let mutualCount = 0;
        candidateFriends.forEach((fUid) => {
          if (myFriends.has(fUid)) mutualCount++;
        });

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

        let score = 0;
        score += mutualCount * 10;
        score += Math.min(mutualGroupsCount, 3) * 4;
        if (hasMessaged) score += 5;

        const premiumScores = { max: 4, pro: 3, lite: 2 };
        score += premiumScores[u.premiumLevel] || 0;

        const roleScores = { admin: 3, moderator: 2 };
        score += roleScores[u.role] || 0;

        score += Math.random() * 1.5;

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

    await setCache(cacheKey, suggestions, CACHE_TTL.SUGGESTIONS);

    return { suggestions };
  }
}

export const friendService = new FriendService();
