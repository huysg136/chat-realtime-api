import { typingService } from "./typing.service.js";
import { AppError } from "../../utils/AppError.js";

const updateTyping = async (req, res) => {
  const uid = req.user.uid;
  const { roomId, action } = req.body;

  if (!roomId || !["start", "stop"].includes(action)) {
    throw new AppError("roomId and a valid action are required", 400);
  }

  const data =
    action === "start"
      ? await typingService.startTyping({ roomId, uid })
      : await typingService.stopTyping({ roomId, uid });

  res.status(200).json({ ok: true, data });
};

const getTypingUsers = async (req, res) => {
  const uid = req.user.uid;
  const { roomId } = req.query;

  if (!roomId) {
    throw new AppError("roomId is required", 400);
  }

  const typingUids = await typingService.getTypingUsers({
    roomId,
    excludeUid: uid,
  });

  res.status(200).json({ ok: true, typingUids });
};

export const typingController = {
  updateTyping,
  getTypingUsers,
};
