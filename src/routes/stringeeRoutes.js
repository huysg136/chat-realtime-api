import express from "express";
import { stringeeController } from "../controllers/stringeeController.js";

const router = express.Router();

router.get("/token", stringeeController.getClientToken.bind(stringeeController));
router.post("/rest-token", stringeeController.getRestToken.bind(stringeeController));
router.post("/create-room", stringeeController.createRoom.bind(stringeeController));
router.post("/generate-room-token", stringeeController.getRoomToken.bind(stringeeController));
router.get("/list-rooms", stringeeController.listRooms.bind(stringeeController));

export default router;
