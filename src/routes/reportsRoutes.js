import express from "express";
import { reportsController } from "../controllers/reportsController.js";

const router = express.Router();

router.post("/notify", reportsController.notify.bind(reportsController));

export default router;
