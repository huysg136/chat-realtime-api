import express from "express";
import { mailController } from "../controllers/mailController.js";

const router = express.Router();

router.post("/notify-report", mailController.notifyReportResult.bind(mailController));
router.post("/notify-new-user", mailController.notifyNewUser.bind(mailController));

export default router;
