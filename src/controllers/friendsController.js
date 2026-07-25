import { friendService } from "../services/friendService.js";

export const sendFriendRequest = async (req, res) => {
  try {
    const fromUid = req.user.uid;
    const { toUid } = req.body;
    const result = await friendService.sendFriendRequest(fromUid, toUid);
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const myUid = req.user.uid;
    const { requestId, fromUid } = req.body;
    const result = await friendService.acceptFriendRequest(myUid, requestId, fromUid);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

export const rejectFriendRequest = async (req, res) => {
  try {
    const myUid = req.user.uid;
    const { requestId } = req.body;
    const result = await friendService.rejectFriendRequest(myUid, requestId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

export const cancelFriendRequest = async (req, res) => {
  try {
    const fromUid = req.user.uid;
    const { toUid } = req.body;
    const result = await friendService.cancelFriendRequest(fromUid, toUid);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

export const unfriend = async (req, res) => {
  try {
    const myUid = req.user.uid;
    const { targetUid } = req.body;
    const result = await friendService.unfriend(myUid, targetUid);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { notificationId } = req.params;
    const result = await friendService.markNotificationAsRead(uid, notificationId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const uid = req.user.uid;
    const result = await friendService.markAllNotificationsAsRead(uid);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const uid = req.user.uid;
    const result = await friendService.getUnreadCount(uid);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false });
  }
};

export const getFriendSuggestions = async (req, res) => {
  try {
    const uid = req.user.uid;
    const result = await friendService.getFriendSuggestions(uid);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};