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
} from "./friend.controller.js";
import {
  friendRequestLimiter,
  friendActionLimiter,
  notificationLimiter,
  suggestionLimiter,
} from "../../middlewares/rateLimiter.js";

const router = express.Router();

// Friend suggestions: 10/min
router.get("/suggestions", suggestionLimiter, getFriendSuggestions);

// Notifications: 30/min
router.get("/notifications/unread-count", notificationLimiter, getUnreadCount);
router.patch("/notifications/:notificationId/read", notificationLimiter, markNotificationAsRead);
router.post("/notifications/read-all", notificationLimiter, markAllNotificationsAsRead);

// Friend actions — request chặt nhất: 10/min
router.post("/request", friendRequestLimiter, sendFriendRequest);

// Accept/Reject/Cancel/Unfriend: 20/min
router.post("/accept", friendActionLimiter, acceptFriendRequest);
router.post("/reject", friendActionLimiter, rejectFriendRequest);
router.post("/cancel", friendActionLimiter, cancelFriendRequest);
router.post("/unfriend", friendActionLimiter, unfriend);

export default router;
