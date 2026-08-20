import { Router } from "express";

import { typingController } from "./typing.controller.js";
import {
  typingReadLimiter,
  typingWriteLimiter,
} from "../../middlewares/rateLimiter.js";

const router = Router();

router.post("/", typingWriteLimiter, typingController.updateTyping);
router.get("/", typingReadLimiter, typingController.getTypingUsers);

export default router;
