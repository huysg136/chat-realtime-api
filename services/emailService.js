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
      color: #1e293b;
      background-color: #f8fafc;
      padding: 40px 20px;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo-container {
      margin: 0 auto 20px;
      width: 80px;
      height: 80px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .logo {
      width: 60px;
      height: 60px;
      object-fit: contain;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 10px;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 20px;
      background: rgba(255, 255, 255, 0.25);
      color: #ffffff;
      border-radius: 20px;
      font-weight: 500;
      font-size: 13px;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 16px;
      color: #475569;
      margin-bottom: 20px;
    }
    .greeting strong {
      color: #1e293b;
    }
    .message-box {
      background: #f1f5f9;
      border-left: 4px solid #64748b;
      padding: 20px;
      margin: 25px 0;
      border-radius: 8px;
    }
    .message-box-title {
      font-size: 13px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .message-text {
      color: #334155;
      font-style: italic;
      font-size: 15px;
      line-height: 1.5;
    }
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 25px;
      margin: 25px 0;
    }
    .info-row {
      display: flex;
      padding: 15px 0;
      border-bottom: 1px solid #e2e8f0;
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
      color: #64748b;
      min-width: 120px;
      font-size: 14px;
    }
    .info-value {
      color: #1e293b;
      flex: 1;
      font-size: 14px;
    }
    .conclusion {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.08) 100%);
      border: 2px solid #3b82f6;
      border-radius: 12px;
      padding: 20px;
      margin: 25px 0;
      text-align: center;
    }
    .conclusion-title {
      font-size: 18px;
      font-weight: 600;
      color: #2563eb;
      margin-bottom: 8px;
    }
    .conclusion-text {
      color: #475569;
      font-size: 14px;
    }
    .footer-note {
      color: #64748b;
      font-size: 14px;
      line-height: 1.6;
      margin-top: 25px;
    }
    .footer {
      background: #f8fafc;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer-brand {
      font-size: 20px;
      font-weight: 700;
      color: #3b82f6;
      margin-bottom: 10px;
      letter-spacing: 0.5px;
    }
    .footer-text {
      font-size: 13px;
      color: #94a3b8;
      margin-top: 5px;
    }
    .footer-link {
      color: #3b82f6;
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
      <div class="logo-container">
        <img src="https://quik.id.vn/logo_quik.png" alt="Quik" class="logo" />
      </div>
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
      color: #1e293b;
      background-color: #f8fafc;
      padding: 40px 20px;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo-container {
      margin: 0 auto 20px;
      width: 80px;
      height: 80px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .logo {
      width: 60px;
      height: 60px;
      object-fit: contain;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 10px;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 20px;
      background: rgba(255, 255, 255, 0.25);
      color: #ffffff;
      border-radius: 20px;
      font-weight: 500;
      font-size: 13px;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 16px;
      color: #475569;
      margin-bottom: 20px;
    }
    .greeting strong {
      color: #1e293b;
    }
    .message-box {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 20px;
      margin: 25px 0;
      border-radius: 8px;
    }
    .message-box-title {
      font-size: 13px;
      color: #dc2626;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .message-text {
      color: #991b1b;
      font-style: italic;
      font-size: 15px;
      line-height: 1.5;
    }
    .success-box {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(22, 163, 74, 0.08) 100%);
      border: 2px solid #22c55e;
      border-radius: 12px;
      padding: 25px;
      margin: 25px 0;
      text-align: center;
    }
    .success-title {
      font-size: 18px;
      font-weight: 600;
      color: #16a34a;
      margin-bottom: 10px;
    }
    .success-text {
      color: #15803d;
      font-size: 15px;
    }
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 25px;
      margin: 25px 0;
    }
    .info-row {
      display: flex;
      padding: 15px 0;
      border-bottom: 1px solid #e2e8f0;
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
      color: #64748b;
      min-width: 120px;
      font-size: 14px;
    }
    .info-value {
      color: #1e293b;
      flex: 1;
      font-size: 14px;
    }
    .footer-note {
      color: #64748b;
      font-size: 14px;
      line-height: 1.6;
      margin-top: 25px;
    }
    .thank-you {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.08) 100%);
      border: 2px solid #3b82f6;
      border-radius: 8px;
      padding: 15px;
      margin-top: 20px;
      text-align: center;
      color: #2563eb;
      font-weight: 500;
    }
    .footer {
      background: #f8fafc;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer-brand {
      font-size: 20px;
      font-weight: 700;
      color: #3b82f6;
      margin-bottom: 10px;
      letter-spacing: 0.5px;
    }
    .footer-text {
      font-size: 13px;
      color: #94a3b8;
      margin-top: 5px;
    }
    .footer-link {
      color: #3b82f6;
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
      <div class="logo-container">
        <img src="https://quik.id.vn/images/logo_quik.png" alt="Quik" class="logo" />
      </div>
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