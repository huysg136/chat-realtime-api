import express from "express";
import { createPost, getFeed, likePost, commentPost, likeComment, checkNewPosts, deleteComment, deletePost } from "../controllers/postsController.js";

const router = express.Router();

router.post("/", createPost);
router.delete("/:postId", deletePost);
router.get("/feed", getFeed);
router.get("/feed/check-new", checkNewPosts);
router.post("/:postId/like", likePost);
router.post("/:postId/comment", commentPost);
router.delete("/:postId/comment/:commentId", deleteComment);
router.post("/:postId/comment/:commentId/like", likeComment);

export default router;

