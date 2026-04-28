import express from "express";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  unfriend,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getFriendSuggestions,
} from "../controllers/friendsController.js";

const router = express.Router();

router.get("/suggestions", getFriendSuggestions);


router.post("/request", sendFriendRequest);
router.post("/accept", acceptFriendRequest);
router.post("/reject", rejectFriendRequest);
router.post("/cancel", cancelFriendRequest);
router.post("/unfriend", unfriend);

router.patch("/notifications/:notificationId/read", markNotificationAsRead);
router.post("/notifications/read-all", markAllNotificationsAsRead);

export default router;
