import express from "express";
import { stringeeController } from "./StringeeController.js";

const router = express.Router();

router.get("/token", stringeeController.getClientToken);
router.post("/rest-token", stringeeController.getRestToken);
router.post("/create-room", stringeeController.createRoom);
router.post("/generate-room-token", stringeeController.getRoomToken);
router.get("/list-rooms", stringeeController.listRooms);



export default router;
