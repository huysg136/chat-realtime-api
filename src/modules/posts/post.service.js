import { db, admin } from "../../config/firebase.js";
import {
  getCache,
  setCache,
  getMultipleCache,
  deleteCache,
  CACHE_TTL,
  incrementUnreadCount,
  decrementUnreadCount,
} from "../../utils/cache.js";
import { getUserData } from "../users/user.service.js";
import { AppError } from "../../utils/AppError.js";

const QUOTA_LIMIT = {
  free: 100 * 1024 * 1024,
  lite: 2 * 1024 * 1024 * 1024,
  pro: 10 * 1024 * 1024 * 1024,
  max: 30 * 1024 * 1024 * 1024,
};

export class PostService {
  async getFriendUids(uid) {
    try {
      const cacheKey = `friends:${uid}`;
      const cached = await getCache(cacheKey);
      if (cached) {
        return cached;
      }

      const snapshot = await db
        .collection("friends")
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
  }

  async createPost(uid, { content, mediaUrl, kind, privacy, fileSize }) {
    if (content !== undefined && content !== null) {
      if (typeof content !== "string" || content.length > 1000) {
        throw new AppError("Nội dung quá dài (tối đa 1000 ký tự)", 400);
      }
    }

    const parsedFileSize = fileSize ? parseInt(fileSize, 10) : 0;
    if (isNaN(parsedFileSize) || parsedFileSize < 0) {
      throw new AppError("fileSize không hợp lệ", 400);
    }

    const userDoc = await getUserData(uid);
    if (!userDoc) {
      throw new AppError("User not found", 404);
    }

    if (parsedFileSize > 0) {
      const level = userDoc.premiumLevel || "free";
      const limit = QUOTA_LIMIT[level] || QUOTA_LIMIT.free;
      const currentUsed = userDoc.quotaUsed || 0;

      if (currentUsed + parsedFileSize > limit) {
        throw new AppError("Dung lượng bộ nhớ đã đầy. Vui lòng nâng cấp gói.", 400);
      }

      await db.collection("users").doc(userDoc.id).update({
        quotaUsed: admin.firestore.FieldValue.increment(parsedFileSize),
      });
    }

    const postRef = await db.collection("posts").add({
      content: content || "",
      mediaUrl: mediaUrl || null,
      kind: kind || "text",
      uid,
      displayName: userDoc.displayName || "Người dùng",
      photoURL: userDoc.photoURL || "",
      likes: [],
      commentsCount: 0,
      privacy: privacy || "public",
      fileSize: parsedFileSize,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const now = Date.now();
    // Cập nhật timestamp bài mới nhất toàn cục (dùng bởi checkNewPosts)
    await setCache("feed:global:latest_post_time", now, CACHE_TTL.GLOBAL_TIMESTAMP);

    // Xóa feed cache của user vừa đăng + tất cả bạn bè song song
    // getFriendUids đã dùng Redis cache (friends:<uid>) → không tốn Firestore read
    const friendUids = await this.getFriendUids(uid);
    await Promise.all([
      deleteCache(`feed:${uid}:main`),
      ...friendUids.map(fUid => deleteCache(`feed:${fUid}:main`)),
    ]);

    return { postId: postRef.id };
  }

  async updatePost(uid, postId, { content, mediaUrl, kind, privacy, fileSize }) {
    if (!postId) {
      throw new AppError("Missing required fields", 400);
    }

    if (content !== undefined && content !== null) {
      if (typeof content !== "string" || content.length > 5000) {
        throw new AppError("Nội dung quá dài (tối đa 5000 ký tự)", 400);
      }
    }

    const parsedFileSize = fileSize ? parseInt(fileSize, 10) : 0;
    if (isNaN(parsedFileSize) || parsedFileSize < 0) {
      throw new AppError("fileSize không hợp lệ", 400);
    }

    const postRef = db.collection("posts").doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      throw new AppError("Post not found", 404);
    }

    const postData = postDoc.data();

    if (postData.uid !== uid) {
      throw new AppError("Unauthorized", 403);
    }

    const updateData = {
      content: content !== undefined ? content : postData.content,
      mediaUrl: mediaUrl !== undefined ? mediaUrl : postData.mediaUrl,
      kind: kind !== undefined ? kind : postData.kind,
      privacy: privacy !== undefined ? privacy : postData.privacy,
      editedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (parsedFileSize > 0) {
      const userDoc = await getUserData(uid);
      if (userDoc) {
        const level = userDoc.premiumLevel || "free";
        const limit = QUOTA_LIMIT[level] || QUOTA_LIMIT.free;
        const currentUsed = userDoc.quotaUsed || 0;

        if (currentUsed + parsedFileSize > limit) {
          throw new AppError("Dung lượng bộ nhớ đã đầy. Vui lòng nâng cấp gói.", 400);
        }

        await db.collection("users").doc(userDoc.id).update({
          quotaUsed: admin.firestore.FieldValue.increment(parsedFileSize),
        });
      }
    }

    await postRef.update(updateData);
    await deleteCache(`feed:${uid}:main`);

    const now = Date.now();
    await setCache("feed:global:latest_post_time", now, CACHE_TTL.GLOBAL_TIMESTAMP);

    return { success: true };
  }

  async getFeed(userUid, { filterUserId, searchQuery, skipCache, lastCreatedAt, limitQuery }) {
    const limit = Math.min(parseInt(limitQuery) || 15, 50);
    const isMainFeed = !filterUserId && !searchQuery;
    const isFirstPage = !lastCreatedAt;
    const feedCacheKey = `feed:${userUid}:main`;

    if (isMainFeed && isFirstPage && !skipCache) {
      const cachedFeed = await getCache(feedCacheKey);
      if (cachedFeed) {
        return {
          posts: cachedFeed.posts,
          lastCreatedAt: cachedFeed.lastCreatedAt,
          hasMore: cachedFeed.hasMore,
          fromCache: true,
        };
      }
    }

    const friendUids = await this.getFriendUids(userUid);
    let queryRef = db.collection("posts");

    if (isMainFeed) {
      if (lastCreatedAt) {
        const startTimestamp = admin.firestore.Timestamp.fromMillis(parseInt(lastCreatedAt));
        queryRef = queryRef.where("createdAt", "<", startTimestamp);
      }
      queryRef = queryRef.orderBy("createdAt", "desc").limit(limit * 2);
    } else if (filterUserId) {
      if (lastCreatedAt) {
        const startTimestamp = admin.firestore.Timestamp.fromMillis(parseInt(lastCreatedAt));
        queryRef = queryRef.where("uid", "==", filterUserId)
                            .where("createdAt", "<", startTimestamp)
                            .orderBy("createdAt", "desc")
                            .limit(limit * 2);
      } else {
        queryRef = queryRef.where("uid", "==", filterUserId)
                            .orderBy("createdAt", "desc")
                            .limit(limit * 2);
      }
    } else {
      queryRef = queryRef.orderBy("createdAt", "desc").limit(100);
    }

    const snapshot = await queryRef.get();
    const rawPosts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (rawPosts.length === 0) {
      return { posts: [], hasMore: false, lastCreatedAt: null };
    }

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

      await Promise.all(
        chunks.map(async (chunk) => {
          const snapshot = await db.collection("users").where("uid", "in", chunk).get();
          snapshot.forEach((doc) => {
            const data = { id: doc.id, ...doc.data() };
            authorMetadataMap[data.uid] = data;
            setCache(`user_metadata:${data.uid}`, data, CACHE_TTL.USER_METADATA);
          });
        })
      );
    }

    let filteredPosts = rawPosts
      .filter((post) => {
        const isAuthor = post.uid === userUid;
        const isFriend = friendUids.includes(post.uid);

        if (post.privacy === "private") return isAuthor;
        if (post.privacy === "friends") return isAuthor || isFriend;
        return true;
      })
      .filter((post) => {
        if (!searchQuery) return true;
        const contentMatch = post.content?.toLowerCase().includes(searchQuery.toLowerCase());
        const author = authorMetadataMap[post.uid] || {};
        const authorName = author.displayName || post.displayName || "";
        const authorMatch = authorName.toLowerCase().includes(searchQuery.toLowerCase());
        return contentMatch || authorMatch;
      });

    let hasMore = false;
    if (isMainFeed || filterUserId) {
      const hitDbLimit = rawPosts.length === limit * 2;
      const hasExtraFiltered = filteredPosts.length > limit;
      hasMore = hitDbLimit || hasExtraFiltered;
      filteredPosts = filteredPosts.slice(0, limit);
    }

    const postsWithTopComment = filteredPosts.map((post) => ({
      ...post,
      topComment: post.topComment || null,
    }));

    let newLastCreatedAt = null;
    if (filteredPosts.length > 0) {
      const lastVisiblePost = filteredPosts[filteredPosts.length - 1];
      newLastCreatedAt =
        lastVisiblePost?.createdAt?.toMillis?.() ||
        lastVisiblePost?.createdAt?._seconds * 1000 ||
        null;
    } else if (hasMore && rawPosts.length > 0) {
      const lastRawPost = rawPosts[rawPosts.length - 1];
      newLastCreatedAt =
        lastRawPost?.createdAt?.toMillis?.() ||
        lastRawPost?.createdAt?._seconds * 1000 ||
        null;
    }

    const result = {
      posts: postsWithTopComment,
      lastCreatedAt: newLastCreatedAt,
      hasMore: (isMainFeed || filterUserId) ? hasMore : false,
    };

    if (isMainFeed && isFirstPage) {
      await setCache(feedCacheKey, { success: true, ...result }, CACHE_TTL.FEED_MAIN);
    }

    return result;
  }

  async likePost(uid, postId) {
    if (!postId) {
      throw new AppError("Missing required fields", 400);
    }

    const postRef = db.collection("posts").doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      throw new AppError("Post not found", 404);
    }

    const postData = postDoc.data();
    const likes = postData.likes || [];
    const isLiked = likes.includes(uid);

    if (!isLiked) {
      await postRef.update({
        likes: admin.firestore.FieldValue.arrayUnion(uid),
      });

      if (postData.uid !== uid) {
        const senderData = await getUserData(uid);
        await db.collection("notifications").add({
          senderUid: uid,
          receiverUid: postData.uid,
          type: "post_like",
          postId: postId,
          senderName: senderData?.displayName || "Ai đó",
          senderPhoto: senderData?.photoURL || "",
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await incrementUnreadCount(postData.uid);
      }
    } else {
      await postRef.update({
        likes: admin.firestore.FieldValue.arrayRemove(uid),
      });

      const notifSnapshot = await db
        .collection("notifications")
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

    await deleteCache(`feed:${uid}:main`);
    return { success: true };
  }

  async commentPost(uid, { postId, parentId, replyToUid, replyToName, content, postAuthorUid }) {
    if (!postId || !content) {
      throw new AppError("Missing required fields", 400);
    }

    if (typeof content !== "string" || content.trim().length === 0 || content.length > 2000) {
      throw new AppError("Nội dung bình luận không hợp lệ (tối đa 2000 ký tự)", 400);
    }

    const postDoc = await db.collection("posts").doc(postId).get();
    if (!postDoc.exists) {
      throw new AppError("Post not found", 404);
    }
    const postData = postDoc.data();

    const userDoc = await getUserData(uid);
    const displayName = userDoc?.displayName || "Người dùng";
    const photoURL = userDoc?.photoURL || "";

    const commentRef = await db.collection("comments").add({
      postId,
      parentId: parentId || null,
      replyToUid: replyToUid || null,
      replyToName: replyToName || null,
      content: content.trim(),
      uid,
      displayName,
      photoURL,
      likes: [],
      likesCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection("posts").doc(postId).update({
      commentsCount: admin.firestore.FieldValue.increment(1),
    });

    if (!parentId) {
      const currentTop = postData.topComment;
      if (!currentTop || (currentTop.likesCount || 0) <= 0) {
        await db.collection("posts").doc(postId).update({
          topComment: {
            id: commentRef.id,
            postId,
            parentId: null,
            content: content.trim(),
            uid,
            displayName,
            photoURL,
            likes: [],
            likesCount: 0,
            createdAt: admin.firestore.Timestamp.now(),
          },
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
        senderName: displayName,
        senderPhoto: photoURL,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await incrementUnreadCount(targetUid);
    }

    await deleteCache(`feed:${uid}:main`);
    return { commentId: commentRef.id };
  }

  async likeComment(uid, { postId, commentId, displayName, photoURL }) {
    if (!commentId) {
      throw new AppError("Missing required fields", 400);
    }

    const commentRef = db.collection("comments").doc(commentId);
    const commentDoc = await commentRef.get();

    if (!commentDoc.exists) {
      throw new AppError("Comment not found", 404);
    }

    const commentData = commentDoc.data();
    const likes = commentData.likes || [];
    const isLiked = likes.includes(uid);

    if (isLiked) {
      await commentRef.update({
        likes: admin.firestore.FieldValue.arrayRemove(uid),
        likesCount: admin.firestore.FieldValue.increment(-1),
      });

      const notifSnapshot = await db
        .collection("notifications")
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
      await commentRef.update({
        likes: admin.firestore.FieldValue.arrayUnion(uid),
        likesCount: admin.firestore.FieldValue.increment(1),
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

        await incrementUnreadCount(commentData.uid);
      }
    }

    if (!commentData.parentId) {
      const cSnap = await db
        .collection("comments")
        .where("postId", "==", postId)
        .where("parentId", "==", null)
        .orderBy("likesCount", "desc")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (!cSnap.empty) {
        await db.collection("posts").doc(postId).update({
          topComment: { id: cSnap.docs[0].id, ...cSnap.docs[0].data() },
        });
      } else {
        await db.collection("posts").doc(postId).update({
          topComment: null,
        });
      }
    }

    await deleteCache(`feed:${uid}:main`);
    return { success: true };
  }

  async deletePost(uid, postId) {
    if (!postId) {
      throw new AppError("Missing required fields", 400);
    }

    const postRef = db.collection("posts").doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      throw new AppError("Post not found", 404);
    }

    const postData = postDoc.data();

    if (postData.uid !== uid) {
      throw new AppError("Unauthorized", 403);
    }

    const notifsSnapshot = await db
      .collection("notifications")
      .where("postId", "==", postId)
      .where("isRead", "==", false)
      .get();

    const unreadCountToDelete = notifsSnapshot.size;

    await postRef.delete();

    const commentsSnapshot = await db.collection("comments").where("postId", "==", postId).get();
    if (!commentsSnapshot.empty) {
      const batch = db.batch();
      commentsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    if (unreadCountToDelete > 0) {
      const batch = db.batch();
      notifsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      const countsByReceiver = {};
      notifsSnapshot.docs.forEach((doc) => {
        const { receiverUid } = doc.data();
        countsByReceiver[receiverUid] = (countsByReceiver[receiverUid] || 0) + 1;
      });

      await Promise.all(
        Object.entries(countsByReceiver).map(async ([ruid, count]) => {
          await decrementUnreadCount(ruid, count);
        })
      );
    }

    const friendUids = await this.getFriendUids(uid);
    await Promise.all([
      deleteCache(`feed:${uid}:main`),
      ...friendUids.map(fUid => deleteCache(`feed:${fUid}:main`)),
    ]);

    const now = Date.now();
    await setCache("feed:global:latest_post_time", now, CACHE_TTL.GLOBAL_TIMESTAMP);

    return { success: true };
  }

  async checkNewPosts(userUid, since) {
    if (!since) {
      return { count: 0 };
    }

    const globalLatest = await getCache("feed:global:latest_post_time");
    if (globalLatest && parseInt(globalLatest) <= parseInt(since)) {
      return { count: 0 };
    }

    const sinceDate = new Date(parseInt(since));
    const friendUids = await this.getFriendUids(userUid);

    const snapshot = await db
      .collection("posts")
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(sinceDate))
      .where("privacy", "in", ["public", "friends"])
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const newPosts = snapshot.docs
      .map((doc) => ({ uid: doc.data().uid, privacy: doc.data().privacy }))
      .filter((p) => {
        if (p.uid === userUid) return true;
        if (p.privacy === "friends") return friendUids.includes(p.uid);
        return true;
      });

    return { count: newPosts.length };
  }

  async deleteComment(uid, postId, commentId) {
    if (!postId || !commentId) {
      throw new AppError("Missing required fields", 400);
    }

    const batch = db.batch();

    const commentRef = db.collection("comments").doc(commentId);
    const commentDoc = await commentRef.get();
    if (!commentDoc.exists) {
      throw new AppError("Comment not found", 404);
    }

    const allCommentsSnapshot = await db.collection("comments").where("postId", "==", postId).get();
    const allComments = allCommentsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    const idsToDelete = [commentId];
    const findDescendants = (parentId) => {
      allComments.forEach((c) => {
        if (c.parentId === parentId) {
          idsToDelete.push(c.id);
          findDescendants(c.id);
        }
      });
    };
    findDescendants(commentId);

    idsToDelete.forEach((id) => {
      batch.delete(db.collection("comments").doc(id));
    });

    const postRef = db.collection("posts").doc(postId);
    batch.update(postRef, {
      commentsCount: admin.firestore.FieldValue.increment(-idsToDelete.length),
    });

    await batch.commit();

    const commentData = commentDoc.data();
    if (!commentData.parentId) {
      const cSnap = await db
        .collection("comments")
        .where("postId", "==", postId)
        .where("parentId", "==", null)
        .orderBy("likesCount", "desc")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (!cSnap.empty) {
        await db.collection("posts").doc(postId).update({
          topComment: { id: cSnap.docs[0].id, ...cSnap.docs[0].data() },
        });
      } else {
        await db.collection("posts").doc(postId).update({
          topComment: null,
        });
      }
    }

    const notifsSnapshot = await db
      .collection("notifications")
      .where("postId", "==", postId)
      .where("isRead", "==", false)
      .get();

    const relatedNotifs = notifsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return idsToDelete.includes(data.entityId) || (data.type === "post_comment" && idsToDelete.includes(doc.id));
    });

    if (relatedNotifs.length > 0) {
      const nBatch = db.batch();
      const countsByReceiver = {};
      relatedNotifs.forEach((doc) => {
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

    await deleteCache(`feed:${uid}:main`);
    return { success: true };
  }
}

export const postService = new PostService();
