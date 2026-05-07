import express from "express";
import { createPost, getFeed, likePost, commentPost, likeComment, checkNewPosts, deleteComment, deletePost, updatePost } from "../controllers/postsController.js";
import { postsLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.post("/", postsLimiter, createPost);
router.delete("/:postId", postsLimiter, deletePost);
router.put("/:postId", postsLimiter, updatePost);
router.get("/feed", postsLimiter, getFeed);
router.get("/feed/check-new", postsLimiter, checkNewPosts);
router.post("/:postId/like", postsLimiter, likePost);
router.post("/:postId/comment", postsLimiter, commentPost);
router.delete("/:postId/comment/:commentId", postsLimiter, deleteComment);
router.post("/:postId/comment/:commentId/like", postsLimiter, likeComment);

export default router;

