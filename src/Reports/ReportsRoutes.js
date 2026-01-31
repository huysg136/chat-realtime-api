import express from "express";
import { reportsController } from "./ReportsController.js";

const router = express.Router();

router.post("/notify", reportsController.notify);

export default router;
