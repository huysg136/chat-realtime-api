import express from "express";
import { createPost, getFeed, likePost, commentPost, likeComment } from "../controllers/postsController.js";

const router = express.Router();

router.post("/", createPost);
router.get("/feed", getFeed);
router.post("/:postId/like", likePost);
router.post("/:postId/comment", commentPost);
router.post("/:postId/comment/:commentId/like", likeComment);

export default router;

