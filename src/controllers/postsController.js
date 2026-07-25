import { postService } from "../services/postService.js";

export const createPost = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { content, mediaUrl, kind, privacy, fileSize } = req.body;
    const result = await postService.createPost(uid, { content, mediaUrl, kind, privacy, fileSize });
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const uid = req.user.uid;
    const { content, mediaUrl, kind, privacy, fileSize } = req.body;
    const result = await postService.updatePost(uid, postId, { content, mediaUrl, kind, privacy, fileSize });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

export const getFeed = async (req, res) => {
  try {
    const userUid = req.user.uid;
    const { filterUserId, searchQuery, skipCache, lastCreatedAt, limit: limitQuery } = req.query;
    const result = await postService.getFeed(userUid, {
      filterUserId,
      searchQuery,
      skipCache,
      lastCreatedAt,
      limitQuery,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

export const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const uid = req.user.uid;
    const result = await postService.likePost(uid, postId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

export const commentPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const uid = req.user.uid;
    const { parentId, replyToUid, replyToName, content, postAuthorUid } = req.body;
    const result = await postService.commentPost(uid, {
      postId,
      parentId,
      replyToUid,
      replyToName,
      content,
      postAuthorUid,
    });
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

export const likeComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const uid = req.user.uid;
    const { displayName, photoURL } = req.body;
    const result = await postService.likeComment(uid, { postId, commentId, displayName, photoURL });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const uid = req.user.uid;
    const result = await postService.deletePost(uid, postId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

export const checkNewPosts = async (req, res) => {
  try {
    const userUid = req.user.uid;
    const { since } = req.query;
    const result = await postService.checkNewPosts(userUid, since);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, count: 0 });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const uid = req.user.uid;
    const result = await postService.deleteComment(uid, postId, commentId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};
