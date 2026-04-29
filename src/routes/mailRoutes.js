import express from "express";
import { mailController } from "../controllers/mailController.js";
import { mailLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.post("/notify-report", mailLimiter, mailController.notifyReportResult.bind(mailController));
router.post("/notify-new-user", mailLimiter, mailController.notifyNewUser.bind(mailController));

export default router;
