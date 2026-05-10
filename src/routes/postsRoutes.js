import express from "express";
import { createPost, getFeed, likePost, commentPost, likeComment, checkNewPosts, deleteComment, deletePost, updatePost } from "../controllers/postsController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Tất cả các route về bài viết đều yêu cầu đăng nhập
router.use(authMiddleware);

router.post("/", createPost);
router.delete("/:postId", deletePost);
router.put("/:postId", updatePost);
router.get("/feed", getFeed);
router.get("/feed/check-new", checkNewPosts);
router.post("/:postId/like", likePost);
router.post("/:postId/comment", commentPost);
router.delete("/:postId/comment/:commentId", deleteComment);
router.post("/:postId/comment/:commentId/like", likeComment);

export default router;
