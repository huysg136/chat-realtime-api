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

// Feed
router.get("/feed", feedLimiter, getFeed);
router.get("/feed/check-new", feedLimiter, checkNewPosts);

// Create/Update/Delete post
router.post("/", createPostLimiter, createPost);           
router.delete("/:postId", mutatePostLimiter, deletePost);  
router.put("/:postId", mutatePostLimiter, updatePost);     

// Interactions
router.post("/:postId/like", likeLimiter, likePost);                         
router.post("/:postId/comment", commentLimiter, commentPost);                 
router.delete("/:postId/comment/:commentId", mutatePostLimiter, deleteComment);
router.post("/:postId/comment/:commentId/like", likeLimiter, likeComment);     

export default router;
