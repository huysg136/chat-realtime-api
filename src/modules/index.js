import { Router } from "express";

import aiRoutes from "./ai/ai.route.js";
import friendsRoutes from "./friends/friend.route.js";
import mailRoutes from "./mail/mail.route.js";
import postsRoutes from "./posts/post.route.js";
import stringeeRoutes from "./stringee/stringee.route.js";
import typingRoutes from "./typing/typing.route.js";
import uploadRoutes from "./uploads/upload.route.js";

const router = Router();

router.use("/api", aiRoutes);
router.use("/api/friends", friendsRoutes);
router.use("/api/mail", mailRoutes);
router.use("/api/posts", postsRoutes);
router.use("/api/stringee", stringeeRoutes);
router.use("/api/typing", typingRoutes);
router.use(uploadRoutes);

export default router;
