import { friendService } from "./friend.service.js";

export const sendFriendRequest = async (req, res) => {
  const result = await friendService.sendFriendRequest(req.user.uid, req.body.toUid);
  res.status(201).json({ success: true, ...result });
};

export const acceptFriendRequest = async (req, res) => {
  const { requestId, fromUid } = req.body;
  const result = await friendService.acceptFriendRequest(req.user.uid, requestId, fromUid);
  res.status(200).json({ success: true, ...result });
};

export const rejectFriendRequest = async (req, res) => {
  const result = await friendService.rejectFriendRequest(req.user.uid, req.body.requestId);
  res.status(200).json({ success: true, ...result });
};

export const cancelFriendRequest = async (req, res) => {
  const result = await friendService.cancelFriendRequest(req.user.uid, req.body.toUid);
  res.status(200).json({ success: true, ...result });
};

export const unfriend = async (req, res) => {
  const result = await friendService.unfriend(req.user.uid, req.body.targetUid);
  res.status(200).json({ success: true, ...result });
};

export const markNotificationAsRead = async (req, res) => {
  const result = await friendService.markNotificationAsRead(
    req.user.uid,
    req.params.notificationId,
  );
  res.status(200).json({ success: true, ...result });
};

export const markAllNotificationsAsRead = async (req, res) => {
  const result = await friendService.markAllNotificationsAsRead(req.user.uid);
  res.status(200).json({ success: true, ...result });
};

export const getUnreadCount = async (req, res) => {
  const result = await friendService.getUnreadCount(req.user.uid);
  res.status(200).json({ success: true, ...result });
};

export const getFriendSuggestions = async (req, res) => {
  const result = await friendService.getFriendSuggestions(req.user.uid);
  res.status(200).json({ success: true, ...result });
};
