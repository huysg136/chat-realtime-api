import express from "express";
import { stringeeController } from "./stringee.controller.js";
import { stringeeTokenLimiter, stringeeRoomLimiter } from "../../middlewares/rateLimiter.js";

const router = express.Router();

// Lấy token: 20/min
router.get("/token", stringeeTokenLimiter, stringeeController.getClientToken.bind(stringeeController));
router.post("/rest-token", stringeeTokenLimiter, stringeeController.getRestToken.bind(stringeeController));

// Room operations: 10/min
router.post("/create-room", stringeeRoomLimiter, stringeeController.createRoom.bind(stringeeController));
router.post("/generate-room-token", stringeeRoomLimiter, stringeeController.getRoomToken.bind(stringeeController));
router.get("/list-rooms", stringeeTokenLimiter, stringeeController.listRooms.bind(stringeeController));

export default router;
