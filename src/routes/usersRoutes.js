import express from "express";
import { usersController } from "../controllers/usersController.js";

const router = express.Router();

router.post("/new-user-notify", usersController.notifyNewUser.bind(usersController));

export default router;
