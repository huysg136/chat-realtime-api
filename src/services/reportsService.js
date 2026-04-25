import { Resend } from "resend";
import { AppError } from "../utils/AppError.js";

// ==================== HELPERS ====================

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function truncateText(text, maxLength = 160) {
  if (!text) return "";
  const t = String(text);
  return t.length > maxLength ? t.slice(0, maxLength) + "..." : t;
}

function viDate(dateInput) {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    return d.toLocaleDateString("vi-VN");
  } catch {
    return new Date().toLocaleDateString("vi-VN");
  }
}

function baseLayout({ title, contentHtml, isApprove = false }) {
  const brandColor = isApprove ? "#ef4444" : "#3b82f6";

  return `
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.05);border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:40px 40px 32px;text-align:center;border-bottom:1px solid #f1f5f9;">
              <img src="https://quik.id.vn/logo_quik.png" alt="Quik" width="64" style="display:block;margin:2px auto;border-radius:50%;" />
              <div style="font-size:24px;font-weight:700;letter-spacing:-0.5px;color:#0f172a;">Quik</div>
              <div style="margin-top:8px;font-size:13px;font-weight:600;color:${brandColor};text-transform:uppercase;letter-spacing:1.2px;">
                ${escapeHtml(title)}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              ${contentHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;background:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">
              <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">
                Đây là thông báo tự động từ hệ thống quản trị Quik. Vui lòng không phản hồi.
              </p>
            </td>
          </tr>
        </table>
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;margin-top:24px;">
          <tr>
            <td style="text-align:center;font-size:12px;color:#94a3b8;padding:0 20px;">
              © ${new Date().getFullYear()} Made by Thái Gia Huy · quik.id.vn
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function renderRejectEmail({ reporterName, messageText, adminName, reason, reportDate }) {
  const content = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td><p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Xin chào <strong>${escapeHtml(reporterName)}</strong>,</p></td></tr>
      <tr><td><p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#475569;">Cảm ơn bạn đã báo cáo nội dung vào ngày ${escapeHtml(reportDate)}. Sau khi đội ngũ quản trị xem xét, chúng tôi chưa tìm thấy bằng chứng vi phạm quy chuẩn cộng đồng.</p></td></tr>
      <tr><td><table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:12px;margin-bottom:28px;"><tr><td style="padding:20px"><div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:10px;letter-spacing:0.5px;">Nội dung bạn đã báo cáo</div><div style="font-size:15px;color:#1e293b;font-style:italic;line-height:1.5;">"${escapeHtml(messageText)}"</div></td></tr></table></td></tr>
      <tr><td><table width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid #94a3b8;margin-bottom:28px;"><tr><td style="padding-left:16px;"><div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:6px;">Lý do:</div><p style="margin:0;font-size:14px;color:#64748b;">${escapeHtml(reason || "Nội dung này không vi phạm chính sách của chúng tôi.")}</p></td></tr></table></td></tr>
      <tr><td><div style="font-size:13px;color:#94a3b8;">Người xử lý: <strong>${escapeHtml(adminName)}</strong> • ${escapeHtml(viDate())}</div></td></tr>
    </table>
  `;
  return baseLayout({ title: "Kết quả xem xét báo cáo", contentHtml: content, isApprove: false });
}

function renderApproveEmail({ reporterName, messageText, adminName, reason, reportDate, action }) {
  const content = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td><p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Xin chào <strong>${escapeHtml(reporterName)}</strong>,</p></td></tr>
      <tr><td><p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#475569;">Cảm ơn bạn đã báo cáo nội dung vào ngày ${escapeHtml(reportDate)}. Sau khi đội ngũ quản trị xem xét, chúng tôi xác nhận nội dung này đã <strong>vi phạm quy định</strong> của Quik.</p></td></tr>
      <tr><td><table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:12px;margin-bottom:28px;"><tr><td style="padding:20px;"><div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:10px;letter-spacing:0.5px;">Nội dung vi phạm</div><div style="font-size:15px;color:#1e293b;font-style:italic;line-height:1.5;">"${escapeHtml(messageText)}"</div></td></tr></table></td></tr>
      <tr><td><table width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid #ef4444;margin-bottom:28px;"><tr><td style="padding-left:16px;"><div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:6px;">Lý do:</div><p style="margin:0;font-size:14px;color:#64748b;line-height:1.5;">${escapeHtml(reason || "Vi phạm tiêu chuẩn cộng đồng.")}</p></td></tr></table></td></tr>
      <tr><td><div style="font-size:13px;color:#94a3b8;">Người xử lý: <strong>${escapeHtml(adminName)}</strong> • ${escapeHtml(viDate())}</div></td></tr>
    </table>
  `;
  return baseLayout({ title: "Báo cáo của bạn đã được xử lý", contentHtml: content, isApprove: true });
}

function renderNewUserEmail({ displayName, email, uid, username, photoURL }) {
  const content = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td><p style="margin:0 0 16px;font-size:16px;line-height:1.5;">👋 Có người dùng mới vừa đăng ký!</p></td></tr>
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:12px;margin-bottom:28px;">
          <tr><td style="padding:20px;">
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
              ${photoURL ? `<img src="${escapeHtml(photoURL)}" width="56" height="56" style="border-radius:50%;display:block;" />` : ""}
            </div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:6px 0;font-size:13px;font-weight:600;color:#64748b;width:140px;">Tên hiển thị</td>
                <td style="padding:6px 0;font-size:14px;color:#1e293b;">${escapeHtml(displayName || "—")}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:13px;font-weight:600;color:#64748b;">Username</td>
                <td style="padding:6px 0;font-size:14px;color:#1e293b;">@${escapeHtml(username || "—")}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:13px;font-weight:600;color:#64748b;">Email</td>
                <td style="padding:6px 0;font-size:14px;color:#1e293b;">${escapeHtml(email || "—")}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:13px;font-weight:600;color:#64748b;">UID</td>
                <td style="padding:6px 0;font-size:12px;color:#64748b;font-family:monospace;">${escapeHtml(uid || "—")}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:13px;font-weight:600;color:#64748b;">Thời gian</td>
                <td style="padding:6px 0;font-size:14px;color:#1e293b;">${viDate()} — ${new Date().toLocaleTimeString("vi-VN")}</td>
              </tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
    </table>
  `;
  return baseLayout({ title: "Người dùng mới đăng ký", contentHtml: content, isApprove: false });
}

export class ReportsService {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendReportResultEmail(params) {
    if (!process.env.RESEND_API_KEY) {
      throw new AppError("Missing RESEND_API_KEY", 500);
    }
    const { reporterEmail, reporterName, messageText, action, adminName, reason, reportDate } = params;

    if (!reporterEmail) {
      throw new AppError("Missing reporterEmail", 400);
    }

    const safeMessage = truncateText(messageText, 160);
    const safeReportDate = reportDate || viDate();
    const isRejected = action === "reject";
    const subject = isRejected ? "Thông báo kết quả báo cáo từ Quik" : "Quik đã xử lý nội dung bạn báo cáo";

    const html = isRejected
      ? renderRejectEmail({ reporterName: reporterName || "bạn", messageText: safeMessage, adminName: adminName || "Admin", reason, reportDate: safeReportDate })
      : renderApproveEmail({ reporterName: reporterName || "bạn", messageText: safeMessage, adminName: adminName || "Admin", reason, reportDate: safeReportDate, action: action || "delete_only" });

    try {
      const data = await this.resend.emails.send({
        from: "Quik <no-reply@quik.id.vn>",
        to: [reporterEmail],
        subject,
        html,
      });
      return { success: true, data };
    } catch (error) {
      throw new AppError(`Failed to send email: ${error.message}`, 500);
    }
  }

  async sendNewUserNotification({ displayName, email, uid, username, photoURL }) {
    if (!process.env.RESEND_API_KEY) {
      throw new AppError("Missing RESEND_API_KEY", 500);
    }

    const html = renderNewUserEmail({ displayName, email, uid, username, photoURL });

    try {
      const data = await this.resend.emails.send({
        from: "Quik <no-reply@quik.id.vn>",
        to: ["thaigiahuy6912@gmail.com"],
        subject: `[Quik] Người dùng mới: ${displayName || email}`,
        html,
      });
      return { success: true, data };
    } catch (error) {
      throw new AppError(`Failed to send email: ${error.message}`, 500);
    }
  }
}

export const reportsService = new ReportsService();
