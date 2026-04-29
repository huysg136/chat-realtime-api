import express from "express";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  unfriend,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  getFriendSuggestions,
} from "../controllers/friendsController.js";
import { friendsLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.get("/suggestions", friendsLimiter, getFriendSuggestions);
router.get("/notifications/unread-count", friendsLimiter, getUnreadCount);


router.post("/request", friendsLimiter, sendFriendRequest);
router.post("/accept", friendsLimiter, acceptFriendRequest);
router.post("/reject", friendsLimiter, rejectFriendRequest);
router.post("/cancel", friendsLimiter, cancelFriendRequest);
router.post("/unfriend", friendsLimiter, unfriend);

router.patch("/notifications/:notificationId/read", friendsLimiter, markNotificationAsRead);
router.post("/notifications/read-all", friendsLimiter, markAllNotificationsAsRead);

export default router;
