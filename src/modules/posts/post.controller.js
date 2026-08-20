import { postService } from "./post.service.js";

export const createPost = async (req, res) => {
  const { content, mediaUrl, kind, privacy, fileSize } = req.body;
  const result = await postService.createPost(req.user.uid, { content, mediaUrl, kind, privacy, fileSize });
  res.status(201).json({ success: true, ...result });
};

export const updatePost = async (req, res) => {
  const { content, mediaUrl, kind, privacy, fileSize } = req.body;
  const result = await postService.updatePost(req.user.uid, req.params.postId, {
    content, mediaUrl, kind, privacy, fileSize,
  });
  res.status(200).json({ success: true, ...result });
};

export const getFeed = async (req, res) => {
  const { filterUserId, searchQuery, skipCache, lastCreatedAt, limit: limitQuery } = req.query;
  const result = await postService.getFeed(req.user.uid, {
    filterUserId, searchQuery, skipCache, lastCreatedAt, limitQuery,
  });
  res.status(200).json({ success: true, ...result });
};

export const likePost = async (req, res) => {
  const result = await postService.likePost(req.user.uid, req.params.postId);
  res.status(200).json({ success: true, ...result });
};

export const commentPost = async (req, res) => {
  const { parentId, replyToUid, replyToName, content, postAuthorUid } = req.body;
  const result = await postService.commentPost(req.user.uid, {
    postId: req.params.postId, parentId, replyToUid, replyToName, content, postAuthorUid,
  });
  res.status(201).json({ success: true, ...result });
};

export const likeComment = async (req, res) => {
  const { postId, commentId } = req.params;
  const { displayName, photoURL } = req.body;
  const result = await postService.likeComment(req.user.uid, {
    postId, commentId, displayName, photoURL,
  });
  res.status(200).json({ success: true, ...result });
};

export const deletePost = async (req, res) => {
  const result = await postService.deletePost(req.user.uid, req.params.postId);
  res.status(200).json({ success: true, ...result });
};

export const checkNewPosts = async (req, res) => {
  const result = await postService.checkNewPosts(req.user.uid, req.query.since);
  res.status(200).json({ success: true, ...result });
};

export const deleteComment = async (req, res) => {
  const { postId, commentId } = req.params;
  const result = await postService.deleteComment(req.user.uid, postId, commentId);
  res.status(200).json({ success: true, ...result });
};
