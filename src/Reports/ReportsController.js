import { reportsService } from "./ReportsService.js";
import { AppError } from "../Exception/globalErrorHandler.js";

export class ReportsController {
    async notify(req, res, next) {
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

            const result = await reportsService.sendReportResultEmail({
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
}

export const reportsController = new ReportsController();
