import { db, admin } from "../config/firebase.js";

const QUOTA_LIMIT = {
  free: 100 * 1024 * 1024,
  lite: 2 * 1024 * 1024 * 1024,
  pro: 10 * 1024 * 1024 * 1024,
  max: 30 * 1024 * 1024 * 1024,
};

const getUserData = async (uid) => {
  try {
    const snapshot = await db.collection("users").where("uid", "==", uid).get();
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  } catch (error) {
    return null;
  }
};

const getFriendUids = async (uid) => {
  try {
    const snapshot = await db.collection("friends")
      .where("users", "array-contains", uid)
      .get();

    const uids = [];
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const other = data.users.find((u) => u !== uid);
      if (other) uids.push(other);
    });
    return uids;
  } catch (error) {
    return [];
  }
};

const computeScore = ({ post, userUid, friendUids, author }) => {
  const GRAVITY = 1.8;
  const likesCount = post.likes?.length || 0;
  const commentsCount = post.commentsCount || 0;
  const E = likesCount * 1 + commentsCount * 3;

  let A = 0;
  if (post.uid === userUid) A = 15;
  else if (friendUids.includes(post.uid)) A = 8;

  let P = 0;
  if (author?.role === "admin") P = 12;
  else if (author?.role === "moderator") P = 8;
  else if (author?.premiumLevel === "max") P = 6;
  else if (author?.premiumLevel === "pro") P = 4;
  else if (author?.premiumLevel === "lite") P = 2;

  const postTimeMs = post.createdAt?._seconds
    ? post.createdAt._seconds * 1000
    : Date.now();
  const T = Math.max(0, (Date.now() - postTimeMs) / (1000 * 60 * 60));

  const freshnessMultiplier = T < 1 ? 1.3 : 1.0;

  const score = ((E + A + P) / Math.pow(T + 2, GRAVITY)) * freshnessMultiplier;
  return score;
};

export const createPost = async (req, res) => {
  try {
    const { content, mediaUrl, kind, uid, displayName, photoURL, privacy, fileSize } = req.body;

    if (!uid) {
      return res.status(400).json({ success: false, message: "Missing uid" });
    }

    const userDoc = await getUserData(uid);
    if (!userDoc) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check Quota if there is a file
    if (fileSize && fileSize > 0) {
      const level = userDoc.premiumLevel || "free";
      const limit = QUOTA_LIMIT[level] || QUOTA_LIMIT.free;
      const currentUsed = userDoc.quotaUsed || 0;

      if (currentUsed + fileSize > limit) {
        return res.status(400).json({
          success: false,
          message: "Dung lượng bộ nhớ đã đầy. Vui lòng nâng cấp gói."
        });
      }

      // Update Quota
      await db.collection("users").doc(userDoc.id).update({
        quotaUsed: admin.firestore.FieldValue.increment(fileSize)
      });
    }

    // Create Post
    const postRef = await db.collection("posts").add({
      content: content || "",
      mediaUrl: mediaUrl || null,
      kind: kind || "text",
      uid,
      displayName: displayName || userDoc.displayName || "Người dùng",
      photoURL: photoURL || userDoc.photoURL || "",
      likes: [],
      commentsCount: 0,
      privacy: privacy || "public",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ success: true, postId: postRef.id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFeed = async (req, res) => {
  try {
    const { userUid, filterUserId, searchQuery } = req.query;

    if (!userUid) {
      return res.status(400).json({ success: false, message: "Missing userUid" });
    }

    const friendUids = await getFriendUids(userUid);
    const windowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    let queryRef = db.collection("posts");

    if (filterUserId) {
      queryRef = queryRef.where("uid", "==", filterUserId);
    } else {
      queryRef = queryRef.where("createdAt", ">=", admin.firestore.Timestamp.fromDate(windowStart));
    }

    // Firestore Admin SDK orderBy
    queryRef = queryRef.orderBy("createdAt", "desc");

    const snapshot = await queryRef.get();
    const rawPosts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Fetch all users to get roles/premium for scoring
    const usersSnapshot = await db.collection("users").get();
    const allUsers = {};
    usersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.uid) allUsers[data.uid] = data;
    });

    // Filter by Privacy & Search Query
    const scoredPosts = rawPosts
      .filter((post) => {
        // Privacy filter
        const isAuthor = post.uid === userUid;
        const isFriend = friendUids.includes(post.uid);

        if (post.privacy === "private") return isAuthor;
        if (post.privacy === "friends") return isAuthor || isFriend;
        return true; // public
      })
      .filter((post) => {
        // Search filter
        if (!searchQuery) return true;
        const contentMatch = post.content?.toLowerCase().includes(searchQuery.toLowerCase());
        const author = allUsers[post.uid] || {};
        const authorName = author.displayName || post.displayName || "";
        const authorMatch = authorName.toLowerCase().includes(searchQuery.toLowerCase());
        return contentMatch || authorMatch;
      })
      .map((post) => {
        const author = allUsers[post.uid] || {};
        const score = computeScore({ post, userUid, friendUids, author });
        return { ...post, _score: score };
      });

    // Sort
    if (filterUserId) {
      scoredPosts.sort((a, b) => {
        const aTime = a.createdAt?._seconds ?? 0;
        const bTime = b.createdAt?._seconds ?? 0;
        return bTime - aTime;
      });
    } else {
      scoredPosts.sort((a, b) => {
        if (Math.abs(b._score - a._score) > 0.001) return b._score - a._score;
        const aTime = a.createdAt?._seconds ?? 0;
        const bTime = b.createdAt?._seconds ?? 0;
        return bTime - aTime;
      });
    }

    res.status(200).json({ success: true, posts: scoredPosts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { uid, displayName, photoURL } = req.body;

    if (!postId || !uid) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const postRef = db.collection("posts").doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const postData = postDoc.data();
    const likes = postData.likes || [];
    const isLiked = likes.includes(uid);

    if (isLiked) {
      await postRef.update({
        likes: admin.firestore.FieldValue.arrayRemove(uid)
      });
    } else {
      await postRef.update({
        likes: admin.firestore.FieldValue.arrayUnion(uid)
      });

      if (postData.uid !== uid) {
        await db.collection("notifications").add({
          senderUid: uid,
          receiverUid: postData.uid,
          type: "post_like",
          postId: postId,
          senderName: displayName || "Ai đó",
          senderPhoto: photoURL || "",
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const commentPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { parentId, replyToUid, replyToName, content, uid, displayName, photoURL, postAuthorUid } = req.body;

    if (!postId || !uid || !content) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const commentRef = await db.collection("comments").add({
      postId,
      parentId: parentId || null,
      replyToUid: replyToUid || null,
      replyToName: replyToName || null,
      content,
      uid,
      displayName: displayName || "Người dùng",
      photoURL: photoURL || "",
      likes: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection("posts").doc(postId).update({
      commentsCount: admin.firestore.FieldValue.increment(1)
    });

    let targetUid = postAuthorUid;
    if (!targetUid) {
      const postDoc = await db.collection("posts").doc(postId).get();
      if (postDoc.exists) {
        targetUid = postDoc.data().uid;
      }
    }

    if (targetUid && targetUid !== uid) {
      await db.collection("notifications").add({
        senderUid: uid,
        receiverUid: targetUid,
        type: "post_comment",
        postId: postId,
        senderName: displayName || "Ai đó",
        senderPhoto: photoURL || "",
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.status(201).json({ success: true, commentId: commentRef.id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const likeComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { uid, displayName, photoURL } = req.body;

    if (!commentId || !uid) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const commentRef = db.collection("comments").doc(commentId);
    const commentDoc = await commentRef.get();

    if (!commentDoc.exists) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const commentData = commentDoc.data();
    const likes = commentData.likes || [];
    const isLiked = likes.includes(uid);

    if (isLiked) {
      await commentRef.update({
        likes: admin.firestore.FieldValue.arrayRemove(uid)
      });
    } else {
      await commentRef.update({
        likes: admin.firestore.FieldValue.arrayUnion(uid)
      });

      if (commentData.uid !== uid) {
        await db.collection("notifications").add({
          senderUid: uid,
          receiverUid: commentData.uid,
          type: "comment_like",
          postId: postId,
          senderName: displayName || "Ai đó",
          senderPhoto: photoURL || "",
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
