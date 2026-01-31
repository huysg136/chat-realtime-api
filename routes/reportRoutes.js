// backend/routes/reportRoutes.js
import express from 'express';
import { sendReportResultEmail } from '../services/emailService.js';

const router = express.Router();

/**
 * POST /api/reports/notify
 * Gửi email thông báo kết quả xử lý báo cáo
 */
router.post('/notify', async (req, res) => {
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

    // Validate input
    if (!reporterEmail || !reporterName || !action) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Send email
    const result = await sendReportResultEmail({
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

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "Email sent successfully",
        data: result.data,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to send email",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error in /notify:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

export default router;