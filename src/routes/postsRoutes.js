import express from "express";
import { createPost, getFeed, likePost, commentPost, likeComment, checkNewPosts, deleteComment, deletePost, updatePost } from "../controllers/postsController.js";
import {
  createPostLimiter,
  mutatePostLimiter,
  feedLimiter,
  likeLimiter,
  commentLimiter,
} from "../middlewares/rateLimiter.js";

const router = express.Router();

// Feed: 60/min
router.get("/feed", feedLimiter, getFeed);
router.get("/feed/check-new", feedLimiter, checkNewPosts);

// Create/Update/Delete post
router.post("/", createPostLimiter, createPost);           // 10/min
router.delete("/:postId", mutatePostLimiter, deletePost);  // 15/min
router.put("/:postId", mutatePostLimiter, updatePost);     // 15/min

// Interactions
router.post("/:postId/like", likeLimiter, likePost);                           // 60/min
router.post("/:postId/comment", commentLimiter, commentPost);                  // 20/min
router.delete("/:postId/comment/:commentId", mutatePostLimiter, deleteComment);// 15/min
router.post("/:postId/comment/:commentId/like", likeLimiter, likeComment);     // 60/min

export default router;
