// backend/services/emailService.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// ==================== EMAIL TEMPLATES ====================

/**
 * Template cho báo cáo bị TỪ CHỐI (không vi phạm)
 */
function getRejectTemplate({ reporterName, messageText, adminName, reason, reportDate }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #ffffff;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      background: #10b981;
      color: white;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      margin: 10px 0;
    }
    .status-badge.rejected {
      background: #8b9a9f;
    }
    .message-box {
      background: #f9fafb;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-row {
      display: flex;
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #6b7280;
      min-width: 120px;
    }
    .info-value {
      color: #111827;
      flex: 1;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 13px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Kết quả xử lý báo cáo</h1>
      <span class="status-badge rejected">Không vi phạm</span>
    </div>

    <p>Xin chào <strong>${reporterName}</strong>,</p>
    
    <p>Cảm ơn bạn đã báo cáo tin nhắn vi phạm vào ngày <strong>${reportDate}</strong>. Sau khi xem xét kỹ lưỡng, chúng tôi xin thông báo kết quả như sau:</p>

    <div class="message-box">
      <strong>Tin nhắn được báo cáo:</strong>
      <p style="margin: 10px 0; font-style: italic;">"${messageText}"</p>
    </div>

    <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div class="info-row">
        <div class="info-label">🔍 Kết luận:</div>
        <div class="info-value"><strong>Không có dấu hiệu vi phạm</strong></div>
      </div>
      <div class="info-row">
        <div class="info-label">👤 Xử lý bởi:</div>
        <div class="info-value">${adminName}</div>
      </div>
      <div class="info-row">
        <div class="info-label">📝 Lý do:</div>
        <div class="info-value">${reason}</div>
      </div>
    </div>

    <p>Chúng tôi rất trân trọng sự quan tâm của bạn trong việc giữ cho cộng đồng an toàn. Mặc dù lần này tin nhắn không vi phạm quy định, nhưng việc báo cáo của bạn vẫn rất quan trọng với chúng tôi.</p>

    <div class="footer">
      <p><strong>Quik</strong></p>
      <p>Email này được gửi tự động, vui lòng không trả lời.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Template cho báo cáo ĐƯỢC CHẤP NHẬN (xóa tin nhắn)
 */
function getApproveTemplate({ reporterName, messageText, adminName, reason, reportDate, action }) {
  const actionText = action === "delete_and_ban" 
    ? "Tin nhắn đã bị xóa và người vi phạm đã bị cấm chat"
    : "Tin nhắn đã bị xóa khỏi hệ thống";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #ffffff;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      background: #ef4444;
      color: white;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      margin: 10px 0;
    }
    .message-box {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-row {
      display: flex;
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #6b7280;
      min-width: 120px;
    }
    .info-value {
      color: #111827;
      flex: 1;
    }
    .success-box {
      background: #dcfce7;
      border: 2px solid #22c55e;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    }
    .success-box h3 {
      color: #16a34a;
      margin: 0 0 10px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Kết quả xử lý báo cáo</h1>
      <span class="status-badge">Đã xử lý vi phạm</span>
    </div>

    <p>Xin chào <strong>${reporterName}</strong>,</p>
    
    <p>Cảm ơn bạn đã báo cáo tin nhắn vi phạm vào ngày <strong>${reportDate}</strong>. Sau khi xem xét, chúng tôi xác nhận tin nhắn này <strong>vi phạm quy định cộng đồng</strong>.</p>

    <div class="message-box">
      <strong>⚠️ Tin nhắn vi phạm:</strong>
      <p style="margin: 10px 0; font-style: italic; color: #991b1b;">"${messageText}"</p>
    </div>

    <div class="success-box">
      <h3>✅ Hành động đã thực hiện</h3>
      <p style="margin: 0; font-size: 15px;">${actionText}</p>
    </div>

    <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div class="info-row">
        <div class="info-label">👤 Xử lý bởi:</div>
        <div class="info-value">${adminName}</div>
      </div>
      <div class="info-row">
        <div class="info-label">📝 Lý do:</div>
        <div class="info-value">${reason}</div>
      </div>
    </div>

    <p>Chúng tôi đánh giá cao việc bạn đã giúp chúng tôi duy trì một cộng đồng an toàn và lành mạnh. Báo cáo của bạn đã giúp chúng tôi ngăn chặn nội dung vi phạm.</p>

    <p style="color: #16a34a; font-weight: 600;">🙏 Cảm ơn bạn đã là một thành viên có trách nhiệm!</p>

    <div class="footer">
      <p><strong>Quik </strong></p>
      <p>Email này được gửi tự động, vui lòng không trả lời.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// ==================== MAIN FUNCTIONS ====================

/**
 * Gửi email thông báo kết quả xử lý báo cáo
 */
export async function sendReportResultEmail({
  reporterEmail,
  reporterName,
  messageText,
  action, // "delete_only", "delete_and_ban", "reject"
  adminName,
  reason,
  reportDate,
  banDuration,
  banUnit,
}) {
  try {
    // Chọn template dựa vào action
    const isRejected = action === "reject";
    const emailTemplate = isRejected
      ? getRejectTemplate({
          reporterName,
          messageText: truncateText(messageText, 100),
          adminName,
          reason,
          reportDate,
        })
      : getApproveTemplate({
          reporterName,
          messageText: truncateText(messageText, 100),
          adminName,
          reason,
          reportDate,
          action,
        });

    const subject = isRejected
      ? "📋 Kết quả báo cáo: Không vi phạm"
      : "✅ Kết quả báo cáo: Đã xử lý vi phạm";

    const data = await resend.emails.send({
      from: 'Quik <noreply@quik.id.vn>', // ⭐ Thay bằng domain của bạn
      to: [reporterEmail],
      subject: subject,
      html: emailTemplate,
    });

    console.log("✅ Email sent successfully:", data);
    return { success: true, data };
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    return { success: false, error };
  }
}

// Helper function
function truncateText(text, maxLength) {
  if (!text) return "";
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}

export default { sendReportResultEmail };