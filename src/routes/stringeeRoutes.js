import express from "express";
import { stringeeController } from "../controllers/stringeeController.js";
import { stringeeLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.get("/token", stringeeLimiter, stringeeController.getClientToken.bind(stringeeController));
router.post("/rest-token", stringeeLimiter, stringeeController.getRestToken.bind(stringeeController));
router.post("/create-room", stringeeLimiter, stringeeController.createRoom.bind(stringeeController));
router.post("/generate-room-token", stringeeLimiter, stringeeController.getRoomToken.bind(stringeeController));
router.get("/list-rooms", stringeeLimiter, stringeeController.listRooms.bind(stringeeController));

export default router;
