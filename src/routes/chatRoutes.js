import { Router } from "express";
import { chatController } from "../controllers/chatController.js";
import { typingReadLimiter, typingWriteLimiter } from "../middlewares/rateLimiter.js";

const router = Router();

router.post("/", typingWriteLimiter, chatController.postTyping);
router.get("/", typingReadLimiter, chatController.getTyping);

export default router;