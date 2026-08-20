import { mailService } from "./mail.service.js";
import { AppError } from "../../utils/AppError.js";

export class MailController {
    async notifyReportResult(req, res, next) {
        try {
            const {
                reporterEmail,
                reporterName,
                messageText,
                action,
                adminName,
                reason,
                reportDate,
                banDuration,
                banUnit,
            } = req.body;

            if (!reporterEmail || !reporterName || !action) {
                throw new AppError("Missing required fields", 400);
            }

            const result = await mailService.sendReportResultEmail({
                reporterEmail,
                reporterName,
                messageText,
                action,
                adminName,
                reason,
                reportDate,
                banDuration,
                banUnit,
            });

            res.status(200).json({
                success: true,
                message: "Email sent successfully",
                data: result.data,
            });
        } catch (err) {
            next(err);
        }
    }

    async notifyNewUser(req, res, next) {
        try {
            const { displayName, email, uid, username, photoURL } = req.body;

            const result = await mailService.sendNewUserNotification({
                displayName,
                email,
                uid,
                username,
                photoURL,
            });

            res.status(200).json({
                success: true,
                message: "New user notification email sent",
                data: result.data,
            });
        } catch (err) {
            next(err);
        }
    }
}

export const mailController = new MailController();
