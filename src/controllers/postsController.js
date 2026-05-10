import { db, admin } from "../config/firebase.js";
import { getCache, setCache, getMultipleCache, deleteCache, CACHE_TTL, incrementUnreadCount, decrementUnreadCount } from "../utils/cache.js";

const QUOTA_LIMIT = {
  free: 100 * 1024 * 1024,
  lite: 2 * 1024 * 1024 * 1024,
  pro: 10 * 1024 * 1024 * 1024,
  max: 30 * 1024 * 1024 * 1024,
};

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

const getFriendUids = async (uid) => {
  try {
    const cacheKey = `friends:${uid}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      console.log(`[Cache] HIT friends for user: ${uid}`);
      return cached;
    }

    console.log(`[Cache] MISS friends for user: ${uid}. Fetching from Firestore...`);
    const snapshot = await db.collection("friends")
      .where("users", "array-contains", uid)
      .get();

    const uids = [];
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const other = data.users.find((u) => u !== uid);
      if (other) uids.push(other);
    });

    await setCache(cacheKey, uids, CACHE_TTL.FRIENDS_LIST);
    return uids;
  } catch (error) {
    return [];
  }
};

const computeScore = ({ post, userUid, friendUids, author }) => {
  const GRAVITY = 1.5;
  const likesCount = (post.likes || []).filter(id => id !== post.uid).length;
  const commentsCount = post.commentsCount || 0;
  const E = likesCount * 1 + commentsCount * 3;

  let A = 0;
  if (post.uid === userUid) A = 5;
  else if (friendUids.includes(post.uid)) A = 6;

  let P = 0;
  if (author?.role === "admin") P = 6;
  else if (author?.role === "moderator") P = 4;
  else if (author?.premiumLevel === "max") P = 3;
  else if (author?.premiumLevel === "pro") P = 2;
  else if (author?.premiumLevel === "lite") P = 1;

  const postTimeMs = post.createdAt?.toMillis?.()
    ?? (post.createdAt?._seconds ? post.createdAt._seconds * 1000
    : (post.createdAt?.seconds ? post.createdAt.seconds * 1000
    : Date.now()));
  const T = Math.max(0, (Date.now() - postTimeMs) / (1000 * 60 * 60));

  const freshnessMultiplier = T < 1 ? 1.3 : 1.0;

  const score = ((E + A + P) / Math.pow(T + 2, GRAVITY)) * freshnessMultiplier;
  return score;
};

export const createPost = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { content, mediaUrl, kind, displayName, photoURL, privacy, fileSize } = req.body;

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
      fileSize: fileSize || 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Cập nhật Timestamp toàn cục vào Redis để tối ưu checkNewPosts
    const now = Date.now();
    await setCache("feed:global:latest_post_time", now, CACHE_TTL.GLOBAL_TIMESTAMP);

    // Invalidate author's feed cache
    const feedCacheKey = `feed:${uid}:main`;
    await deleteCache(feedCacheKey);

    res.status(201).json({ success: true, postId: postRef.id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const uid = req.user.uid;
    const { content, mediaUrl, kind, privacy, fileSize } = req.body;

    if (!postId) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const postRef = db.collection("posts").doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const postData = postDoc.data();

    // Check ownership
    if (postData.uid !== uid) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const updateData = {
      content: content !== undefined ? content : postData.content,
      mediaUrl: mediaUrl !== undefined ? mediaUrl : postData.mediaUrl,
      kind: kind !== undefined ? kind : postData.kind,
      privacy: privacy !== undefined ? privacy : postData.privacy,
      editedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Update Quota if fileSize is provided (new file uploaded)
    if (fileSize && fileSize > 0) {
      const userDoc = await getUserData(uid);
      if (userDoc) {
        const level = userDoc.premiumLevel || "free";
        const limit = QUOTA_LIMIT[level] || QUOTA_LIMIT.free;
        const currentUsed = userDoc.quotaUsed || 0;

        // Note: This logic assumes we add to quota. 
        // In a real scenario, we might want to subtract the old file size if it's being replaced.
        if (currentUsed + fileSize > limit) {
          return res.status(400).json({
            success: false,
            message: "Dung lượng bộ nhớ đã đầy. Vui lòng nâng cấp gói."
          });
        }

        await db.collection("users").doc(userDoc.id).update({
          quotaUsed: admin.firestore.FieldValue.increment(fileSize)
        });
      }
    }

    await postRef.update(updateData);

    // Invalidate Feed Cache
    await deleteCache(`feed:${uid}:main`);
    
    // Update global timestamp to trigger checkNewPosts for others if privacy is public/friends
    const now = Date.now();
    await setCache("feed:global:latest_post_time", now, CACHE_TTL.GLOBAL_TIMESTAMP);

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFeed = async (req, res) => {
  try {
    const userUid = req.user.uid;
    const { filterUserId, searchQuery, skipCache, lastCreatedAt, limit: limitQuery } = req.query;
    const limit = Math.min(parseInt(limitQuery) || 15, 50);

    const isMainFeed = !filterUserId && !searchQuery;
    const isFirstPage = !lastCreatedAt;
    const feedCacheKey = `feed:${userUid}:main`;

    // 1. Cache strategy: Only cache the first page of Main Feed
    if (isMainFeed && isFirstPage && !skipCache) {
      const cachedFeed = await getCache(feedCacheKey);
      if (cachedFeed) {
        console.log(`[Cache] HIT Main Feed for user: ${userUid}`);
        return res.status(200).json({
          success: true,
          posts: cachedFeed.posts,
          lastCreatedAt: cachedFeed.lastCreatedAt,
          hasMore: cachedFeed.hasMore,
          fromCache: true
        });
      }
    }

    if (isMainFeed && isFirstPage) {
      console.log(`[Cache] MISS Main Feed for user: ${userUid}. Computing...`);
    } else {
      console.log(`[Query] Fetching Feed for user: ${userUid} (lastCreatedAt: ${lastCreatedAt}, limit: ${limit})`);
    }

    const friendUids = await getFriendUids(userUid);
    let queryRef = db.collection("posts");

    if (isMainFeed) {
      // Pagination for Main Feed
      if (lastCreatedAt) {
        const startTimestamp = admin.firestore.Timestamp.fromMillis(parseInt(lastCreatedAt));
        queryRef = queryRef.where("createdAt", "<", startTimestamp);
      }
      // Fetch limit * 2 to buffer privacy filter
      queryRef = queryRef.orderBy("createdAt", "desc").limit(limit * 2);
    } else if (filterUserId) {
      // Profile mode: Fetch all posts by this user (ordered by desc)
      queryRef = queryRef.where("uid", "==", filterUserId).orderBy("createdAt", "desc");
    } else {
      // Search mode: Fetch a larger batch (e.g., 100) to filter client-side without time restriction
      queryRef = queryRef.orderBy("createdAt", "desc").limit(100);
    }

    const snapshot = await queryRef.get();
    const rawPosts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (rawPosts.length === 0) {
      return res.status(200).json({ success: true, posts: [], hasMore: false });
    }

    // Optimization: Bulk fetch metadata from cache
    const authorUids = [...new Set(rawPosts.map((p) => p.uid))];
    const cacheKeys = authorUids.map((uid) => `user_metadata:${uid}`);
    const cachedMetadata = await getMultipleCache(cacheKeys);

    const authorMetadataMap = {};
    const missingUids = [];

    authorUids.forEach((uid, index) => {
      if (cachedMetadata[index]) {
        authorMetadataMap[uid] = cachedMetadata[index];
      } else {
        missingUids.push(uid);
      }
    });

    if (missingUids.length > 0) {
      const chunks = [];
      for (let i = 0; i < missingUids.length; i += 30) {
        chunks.push(missingUids.slice(i, i + 30));
      }

      await Promise.all(chunks.map(async (chunk) => {
        const snapshot = await db.collection("users").where("uid", "in", chunk).get();
        snapshot.forEach(doc => {
          const data = { id: doc.id, ...doc.data() };
          authorMetadataMap[data.uid] = data;
          setCache(`user_metadata:${data.uid}`, data, CACHE_TTL.USER_METADATA);
        });
      }));
    }

    // Filter by Privacy & Search Query
    let filteredPosts = rawPosts
      .filter((post) => {
        const isAuthor = post.uid === userUid;
        const isFriend = friendUids.includes(post.uid);

        if (post.privacy === "private") return isAuthor;
        if (post.privacy === "friends") return isAuthor || isFriend;
        return true; // public
      })
      .filter((post) => {
        if (!searchQuery) return true;
        const contentMatch = post.content?.toLowerCase().includes(searchQuery.toLowerCase());
        const author = authorMetadataMap[post.uid] || {};
        const authorName = author.displayName || post.displayName || "";
        const authorMatch = authorName.toLowerCase().includes(searchQuery.toLowerCase());
        return contentMatch || authorMatch;
      });

    // Determine if there might be more posts
    let hasMore = false;
    if (isMainFeed) {
      // If we got a full batch from Firestore, there's likely more in the DB
      const hitDbLimit = rawPosts.length === limit * 2;
      // If after filtering we have more than the requested limit, we have more to show
      const hasExtraFiltered = filteredPosts.length > limit;
      
      hasMore = hitDbLimit || hasExtraFiltered;
      
      // Slice to requested limit
      filteredPosts = filteredPosts.slice(0, limit);
    }

    const scoredPosts = filteredPosts.map((post) => {
      const author = authorMetadataMap[post.uid] || {};
      const score = computeScore({ post, userUid, friendUids, author });
      return { ...post, _score: score, topComment: post.topComment || null };
    });

    // Get the timestamp of the last post to use as cursor
    let newLastCreatedAt = null;
    if (filteredPosts.length > 0) {
      const lastVisiblePost = filteredPosts[filteredPosts.length - 1];
      newLastCreatedAt = lastVisiblePost?.createdAt?.toMillis?.() || lastVisiblePost?.createdAt?._seconds * 1000 || null;
    } else if (hasMore && rawPosts.length > 0) {
      // If no visible posts in this batch but more exist in DB, use the last raw post to jump
      const lastRawPost = rawPosts[rawPosts.length - 1];
      newLastCreatedAt = lastRawPost?.createdAt?.toMillis?.() || lastRawPost?.createdAt?._seconds * 1000 || null;
    }

    const result = {
      success: true,
      posts: scoredPosts,
      lastCreatedAt: newLastCreatedAt,
      hasMore: isMainFeed ? hasMore : false
    };

    // Cache the first page of Main Feed
    if (isMainFeed && isFirstPage) {
      await setCache(feedCacheKey, result, CACHE_TTL.FEED_MAIN);
    }

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("getFeed error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const uid = req.user.uid;
    const { displayName, photoURL } = req.body;

    if (!postId) {
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
    if (!isLiked) {
      // LIKE
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

        // Tăng số lượng trong Redis
        await incrementUnreadCount(postData.uid);
      }
    } else {
      // UNLIKE
      await postRef.update({
        likes: admin.firestore.FieldValue.arrayRemove(uid)
      });

      // Tìm thông báo chưa đọc tương ứng để xóa và giảm Redis count
      const notifSnapshot = await db.collection("notifications")
        .where("senderUid", "==", uid)
        .where("receiverUid", "==", postData.uid)
        .where("postId", "==", postId)
        .where("type", "==", "post_like")
        .where("isRead", "==", false)
        .limit(1)
        .get();

      if (!notifSnapshot.empty) {
        const notifDoc = notifSnapshot.docs[0];
        await notifDoc.ref.delete();
        await decrementUnreadCount(postData.uid);
      }
    }

    // Invalidate Feed Cache cho người Like
    await deleteCache(`feed:${uid}:main`);

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const commentPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const uid = req.user.uid;
    const { parentId, replyToUid, replyToName, content, displayName, photoURL, postAuthorUid } = req.body;

    if (!postId || !content) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const postDoc = await db.collection("posts").doc(postId).get();
    if (!postDoc.exists) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    const postData = postDoc.data();

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
      likesCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection("posts").doc(postId).update({
      commentsCount: admin.firestore.FieldValue.increment(1)
    });

    if (!parentId) {
      const currentTop = postData.topComment;
      if (!currentTop || (currentTop.likesCount || 0) <= 0) {
        await db.collection("posts").doc(postId).update({
          topComment: {
            id: commentRef.id,
            postId,
            parentId: null,
            content,
            uid,
            displayName: displayName || "Người dùng",
            photoURL: photoURL || "",
            likes: [],
            likesCount: 0,
            createdAt: admin.firestore.Timestamp.now()
          }
        });
      }
    }

    const targetUid = postAuthorUid || postData.uid;

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

      // Tăng Redis count
      await incrementUnreadCount(targetUid);
    }

    // Invalidate Feed Cache cho người Comment
    await deleteCache(`feed:${uid}:main`);

    res.status(201).json({ success: true, commentId: commentRef.id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const likeComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const uid = req.user.uid;
    const { displayName, photoURL } = req.body;

    if (!commentId) {
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
      // UNLIKE COMMENT
      await commentRef.update({
        likes: admin.firestore.FieldValue.arrayRemove(uid),
        likesCount: admin.firestore.FieldValue.increment(-1)
      });

      // Tìm thông báo chưa đọc tương ứng để xóa và giảm Redis count
      const notifSnapshot = await db.collection("notifications")
        .where("senderUid", "==", uid)
        .where("receiverUid", "==", commentData.uid)
        .where("postId", "==", postId)
        .where("type", "==", "comment_like")
        .where("isRead", "==", false)
        .limit(1)
        .get();

      if (!notifSnapshot.empty) {
        const notifDoc = notifSnapshot.docs[0];
        await notifDoc.ref.delete();
        await decrementUnreadCount(commentData.uid);
      }
    } else {
      // LIKE COMMENT
      await commentRef.update({
        likes: admin.firestore.FieldValue.arrayUnion(uid),
        likesCount: admin.firestore.FieldValue.increment(1)
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

        // Tăng Redis count
        await incrementUnreadCount(commentData.uid);
      }
    }

    if (!commentData.parentId) {
      const cSnap = await db.collection("comments")
        .where("postId", "==", postId)
        .where("parentId", "==", null)
        .orderBy("likesCount", "desc")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (!cSnap.empty) {
        await db.collection("posts").doc(postId).update({
          topComment: { id: cSnap.docs[0].id, ...cSnap.docs[0].data() }
        });
      } else {
        await db.collection("posts").doc(postId).update({
          topComment: null
        });
      }
    }

    // Invalidate Feed Cache cho người Like Comment
    await deleteCache(`feed:${uid}:main`);

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const uid = req.user.uid;

    if (!postId) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const postRef = db.collection("posts").doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const postData = postDoc.data();

    // Check ownership
    if (postData.uid !== uid) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // 1. Tìm tất cả thông báo CHƯA ĐỌC liên quan đến bài viết này
    const notifsSnapshot = await db.collection("notifications")
      .where("postId", "==", postId)
      .where("isRead", "==", false)
      .get();

    const unreadCountToDelete = notifsSnapshot.size;

    // Delete post
    await postRef.delete();

    // Delete associated comments
    const commentsSnapshot = await db.collection("comments").where("postId", "==", postId).get();
    if (!commentsSnapshot.empty) {
      const batch = db.batch();
      commentsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    // 2. Xóa các thông báo và giảm Redis count (Dùng batch để tối ưu)
    if (unreadCountToDelete > 0) {
      const batch = db.batch();
      notifsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      // Giảm Redis count cho chủ bài viết
      // Lưu ý: Trong hệ thống này, hầu hết thông báo của bài viết (like, comment) đều gửi tới chủ bài viết.
      // Nếu có hệ thống thông báo cho người khác, cần xử lý logic giảm count cho từng người.
      // Ở đây ta giả định receiverUid là người bị ảnh hưởng chính.
      // Để chính xác nhất, ta nên đếm theo từng receiverUid.
      const countsByReceiver = {};
      notifsSnapshot.docs.forEach(doc => {
        const { receiverUid } = doc.data();
        countsByReceiver[receiverUid] = (countsByReceiver[receiverUid] || 0) + 1;
      });

      await Promise.all(
        Object.entries(countsByReceiver).map(async ([ruid, count]) => {
          // Thực hiện giảm count trong Redis (SUB)
          // Có thể lặp decrementUnreadCount hoặc dùng logic SET trực tiếp nếu có helper
          await decrementUnreadCount(ruid, count);
        })
      );
    }

    // Invalidate Cache
    await deleteCache(`feed:${uid}:main`);

    // Update global timestamp
    const now = Date.now();
    await setCache("feed:global:latest_post_time", now, CACHE_TTL.GLOBAL_TIMESTAMP);

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Chỉ trả về số lượng bài mới, không query toàn bộ feed
export const checkNewPosts = async (req, res) => {
  try {
    const userUid = req.user.uid;
    const { since } = req.query;

    if (!since) {
      return res.status(400).json({ success: false });
    }

    // TỐI ƯU: Kiểm tra Global Timestamp trong Redis trước
    const globalLatest = await getCache("feed:global:latest_post_time");
    if (globalLatest && parseInt(globalLatest) <= parseInt(since)) {
      // Chắc chắn không có bài mới toàn cục -> không cần query DB
      return res.status(200).json({ success: true, count: 0 });
    }

    const sinceDate = new Date(parseInt(since));
    const friendUids = await getFriendUids(userUid);

    const snapshot = await db.collection("posts")
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(sinceDate))
      .where("privacy", "in", ["public", "friends"])
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const newPosts = snapshot.docs
      .map(doc => ({ uid: doc.data().uid, privacy: doc.data().privacy }))
      .filter(p => {
        if (p.uid === userUid) return true;
        if (p.privacy === "friends") return friendUids.includes(p.uid);
        return true;
      });

    res.status(200).json({ success: true, count: newPosts.length });
  } catch (error) {
    res.status(500).json({ success: false, count: 0 });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const uid = req.user.uid;

    if (!postId || !commentId) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const batch = db.batch();

    // 1. Tìm comment chính
    const commentRef = db.collection("comments").doc(commentId);
    const commentDoc = await commentRef.get();
    if (!commentDoc.exists) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    // 2. Tìm tất cả comment con (để trừ đúng số lượng)
    const allCommentsSnapshot = await db.collection("comments").where("postId", "==", postId).get();
    const allComments = allCommentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const idsToDelete = [commentId];
    const findDescendants = (parentId) => {
      allComments.forEach(c => {
        if (c.parentId === parentId) {
          idsToDelete.push(c.id);
          findDescendants(c.id);
        }
      });
    };
    findDescendants(commentId);

    // 3. Thực hiện xóa trong batch
    idsToDelete.forEach(id => {
      batch.delete(db.collection("comments").doc(id));
    });

    // 4. Trừ số lượng ở bài viết
    const postRef = db.collection("posts").doc(postId);
    batch.update(postRef, {
      commentsCount: admin.firestore.FieldValue.increment(-idsToDelete.length)
    });

    await batch.commit();

    const commentData = commentDoc.data();
    if (!commentData.parentId) {
      const cSnap = await db.collection("comments")
        .where("postId", "==", postId)
        .where("parentId", "==", null)
        .orderBy("likesCount", "desc")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (!cSnap.empty) {
        await db.collection("posts").doc(postId).update({
          topComment: { id: cSnap.docs[0].id, ...cSnap.docs[0].data() }
        });
      } else {
        await db.collection("posts").doc(postId).update({
          topComment: null
        });
      }
    }

    // 5. Xử lý thông báo chưa đọc liên quan đến các comment bị xóa
    // Tìm các thông báo của những comment này mà chưa đọc
    // Lưu ý: entityId của comment_like là commentId
    // type có thể là post_comment hoặc comment_like
    const notifsSnapshot = await db.collection("notifications")
      .where("postId", "==", postId)
      .where("isRead", "==", false)
      .get();

    // Lọc ra những thông báo liên quan đến idsToDelete hoặc là post_comment của chính những comment này
    const relatedNotifs = notifsSnapshot.docs.filter(doc => {
      const data = doc.data();
      // Nếu là post_comment thì entityId là commentId. Nếu là comment_like thì entityId là commentId.
      return idsToDelete.includes(data.entityId) || (data.type === "post_comment" && idsToDelete.includes(doc.id));
    });

    if (relatedNotifs.length > 0) {
      const nBatch = db.batch();
      const countsByReceiver = {};
      relatedNotifs.forEach(doc => {
        nBatch.delete(doc.ref);
        const { receiverUid } = doc.data();
        countsByReceiver[receiverUid] = (countsByReceiver[receiverUid] || 0) + 1;
      });
      await nBatch.commit();

      await Promise.all(
        Object.entries(countsByReceiver).map(async ([ruid, count]) => {
          await decrementUnreadCount(ruid, count);
        })
      );
    }

    // 6. Invalidate Cache cho người xóa
    await deleteCache(`feed:${uid}:main`);

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
