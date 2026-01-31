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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #e2e8f0;
      background-color: #0f172a;
      padding: 40px 20px;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    }
    .header {
      background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
      padding: 40px 30px;
      text-align: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .logo {
      width: 60px;
      height: 60px;
      margin: 0 auto 20px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: bold;
      color: white;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 600;
      color: #f1f5f9;
      margin-bottom: 10px;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 20px;
      background: rgba(148, 163, 184, 0.2);
      color: #94a3b8;
      border-radius: 20px;
      font-weight: 500;
      font-size: 13px;
      border: 1px solid rgba(148, 163, 184, 0.3);
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 16px;
      color: #cbd5e1;
      margin-bottom: 20px;
    }
    .greeting strong {
      color: #f1f5f9;
    }
    .message-box {
      background: rgba(30, 41, 59, 0.6);
      border-left: 3px solid #64748b;
      padding: 20px;
      margin: 25px 0;
      border-radius: 8px;
    }
    .message-box-title {
      font-size: 13px;
      color: #94a3b8;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .message-text {
      color: #e2e8f0;
      font-style: italic;
      font-size: 15px;
      line-height: 1.5;
    }
    .info-card {
      background: rgba(30, 41, 59, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 25px;
      margin: 25px 0;
    }
    .info-row {
      display: flex;
      padding: 15px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .info-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .info-row:first-child {
      padding-top: 0;
    }
    .info-label {
      font-weight: 600;
      color: #94a3b8;
      min-width: 120px;
      font-size: 14px;
    }
    .info-value {
      color: #e2e8f0;
      flex: 1;
      font-size: 14px;
    }
    .conclusion {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 12px;
      padding: 20px;
      margin: 25px 0;
      text-align: center;
    }
    .conclusion-title {
      font-size: 18px;
      font-weight: 600;
      color: #60a5fa;
      margin-bottom: 8px;
    }
    .conclusion-text {
      color: #cbd5e1;
      font-size: 14px;
    }
    .footer-note {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.6;
      margin-top: 25px;
    }
    .footer {
      background: rgba(15, 23, 42, 0.6);
      padding: 30px;
      text-align: center;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    .footer-brand {
      font-size: 20px;
      font-weight: 700;
      color: #60a5fa;
      margin-bottom: 10px;
      letter-spacing: 0.5px;
    }
    .footer-text {
      font-size: 13px;
      color: #64748b;
      margin-top: 5px;
    }
    .footer-link {
      color: #60a5fa;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      body {
        padding: 20px 10px;
      }
      .content {
        padding: 30px 20px;
      }
      .header {
        padding: 30px 20px;
      }
      .info-row {
        flex-direction: column;
      }
      .info-label {
        margin-bottom: 5px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <div class="logo">Q</div>
      <h1>Kết quả xử lý báo cáo</h1>
      <div style="margin-top: 15px;">
        <span class="status-badge">Không vi phạm</span>
      </div>
    </div>

    <div class="content">
      <p class="greeting">Xin chào <strong>${reporterName}</strong>,</p>
      
      <p class="greeting">
        Cảm ơn bạn đã báo cáo tin nhắn vi phạm vào ngày <strong>${reportDate}</strong>. 
        Sau khi xem xét kỹ lưỡng, chúng tôi xin thông báo kết quả như sau:
      </p>

      <div class="message-box">
        <div class="message-box-title">Tin nhắn được báo cáo</div>
        <div class="message-text">"${messageText}"</div>
      </div>

      <div class="conclusion">
        <div class="conclusion-title">Không có dấu hiệu vi phạm</div>
        <div class="conclusion-text">Nội dung này tuân thủ quy định cộng đồng của chúng tôi</div>
      </div>

      <div class="info-card">
        <div class="info-row">
          <div class="info-label">Xử lý bởi</div>
          <div class="info-value">${adminName}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Lý do</div>
          <div class="info-value">${reason}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Ngày xử lý</div>
          <div class="info-value">${new Date().toLocaleDateString('vi-VN')}</div>
        </div>
      </div>

      <p class="footer-note">
        Chúng tôi rất trân trọng sự quan tâm của bạn trong việc giữ cho cộng đồng an toàn. 
        Mặc dù lần này tin nhắn không vi phạm quy định, nhưng việc báo cáo của bạn vẫn rất 
        quan trọng với chúng tôi.
      </p>
    </div>

    <div class="footer">
      <div class="footer-brand">Quik</div>
      <p class="footer-text">Email này được gửi tự động, vui lòng không trả lời.</p>
      <p class="footer-text" style="margin-top: 10px;">
        <a href="https://quik.id.vn" class="footer-link">quik.id.vn</a>
      </p>
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #e2e8f0;
      background-color: #0f172a;
      padding: 40px 20px;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    }
    .header {
      background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%);
      padding: 40px 30px;
      text-align: center;
      border-bottom: 1px solid rgba(239, 68, 68, 0.3);
    }
    .logo {
      width: 60px;
      height: 60px;
      margin: 0 auto 20px;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: bold;
      color: white;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 600;
      color: #f1f5f9;
      margin-bottom: 10px;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 20px;
      background: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
      border-radius: 20px;
      font-weight: 500;
      font-size: 13px;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 16px;
      color: #cbd5e1;
      margin-bottom: 20px;
    }
    .greeting strong {
      color: #f1f5f9;
    }
    .message-box {
      background: rgba(127, 29, 29, 0.2);
      border-left: 3px solid #ef4444;
      padding: 20px;
      margin: 25px 0;
      border-radius: 8px;
    }
    .message-box-title {
      font-size: 13px;
      color: #fca5a5;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .message-text {
      color: #fecaca;
      font-style: italic;
      font-size: 15px;
      line-height: 1.5;
    }
    .success-box {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.15) 100%);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 12px;
      padding: 25px;
      margin: 25px 0;
      text-align: center;
    }
    .success-title {
      font-size: 18px;
      font-weight: 600;
      color: #4ade80;
      margin-bottom: 10px;
    }
    .success-text {
      color: #86efac;
      font-size: 15px;
    }
    .info-card {
      background: rgba(30, 41, 59, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 25px;
      margin: 25px 0;
    }
    .info-row {
      display: flex;
      padding: 15px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .info-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .info-row:first-child {
      padding-top: 0;
    }
    .info-label {
      font-weight: 600;
      color: #94a3b8;
      min-width: 120px;
      font-size: 14px;
    }
    .info-value {
      color: #e2e8f0;
      flex: 1;
      font-size: 14px;
    }
    .footer-note {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.6;
      margin-top: 25px;
    }
    .thank-you {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 8px;
      padding: 15px;
      margin-top: 20px;
      text-align: center;
      color: #93c5fd;
      font-weight: 500;
    }
    .footer {
      background: rgba(15, 23, 42, 0.6);
      padding: 30px;
      text-align: center;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    .footer-brand {
      font-size: 20px;
      font-weight: 700;
      color: #60a5fa;
      margin-bottom: 10px;
      letter-spacing: 0.5px;
    }
    .footer-text {
      font-size: 13px;
      color: #64748b;
      margin-top: 5px;
    }
    .footer-link {
      color: #60a5fa;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      body {
        padding: 20px 10px;
      }
      .content {
        padding: 30px 20px;
      }
      .header {
        padding: 30px 20px;
      }
      .info-row {
        flex-direction: column;
      }
      .info-label {
        margin-bottom: 5px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <div class="logo">Q</div>
      <h1>Kết quả xử lý báo cáo</h1>
      <div style="margin-top: 15px;">
        <span class="status-badge">Đã xử lý vi phạm</span>
      </div>
    </div>

    <div class="content">
      <p class="greeting">Xin chào <strong>${reporterName}</strong>,</p>
      
      <p class="greeting">
        Cảm ơn bạn đã báo cáo tin nhắn vi phạm vào ngày <strong>${reportDate}</strong>. 
        Sau khi xem xét, chúng tôi xác nhận tin nhắn này <strong>vi phạm quy định cộng đồng</strong>.
      </p>

      <div class="message-box">
        <div class="message-box-title">Tin nhắn vi phạm</div>
        <div class="message-text">"${messageText}"</div>
      </div>

      <div class="success-box">
        <div class="success-title">Hành động đã thực hiện</div>
        <div class="success-text">${actionText}</div>
      </div>

      <div class="info-card">
        <div class="info-row">
          <div class="info-label">Xử lý bởi</div>
          <div class="info-value">${adminName}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Lý do</div>
          <div class="info-value">${reason}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Ngày xử lý</div>
          <div class="info-value">${new Date().toLocaleDateString('vi-VN')}</div>
        </div>
      </div>

      <p class="footer-note">
        Chúng tôi đánh giá cao việc bạn đã giúp chúng tôi duy trì một cộng đồng an toàn và lành mạnh. 
        Báo cáo của bạn đã giúp chúng tôi ngăn chặn nội dung vi phạm.
      </p>

      <div class="thank-you">
        Cảm ơn bạn đã là một thành viên có trách nhiệm!
      </div>
    </div>

    <div class="footer">
      <div class="footer-brand">Quik</div>
      <p class="footer-text">Email này được gửi tự động, vui lòng không trả lời.</p>
      <p class="footer-text" style="margin-top: 10px;">
        <a href="https://quik.id.vn" class="footer-link">quik.id.vn</a>
      </p>
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
      ? "Kết quả báo cáo: Không vi phạm"
      : "Kết quả báo cáo: Đã xử lý vi phạm";

    const data = await resend.emails.send({
      from: 'Quik <admin@quik.id.vn>',
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