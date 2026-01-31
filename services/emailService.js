// backend/services/emailService.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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

function baseLayout({ title, contentHtml }) {
  // CSS tối giản, email client nào cũng chịu được
  return `
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
        <div style="font-size:18px;font-weight:700;">Quik</div>
        <div style="margin-top:4px;font-size:14px;color:#6b7280;">${escapeHtml(title)}</div>
      </div>

      <div style="padding:20px;">
        ${contentHtml}
      </div>

      <div style="padding:14px 20px;border-top:1px solid #e5e7eb;background:#fafafa;font-size:12px;color:#6b7280;">
        Email này được gửi tự động, vui lòng không trả lời.
      </div>
    </div>

    <div style="text-align:center;font-size:12px;color:#9ca3af;margin-top:12px;">
      © ${new Date().getFullYear()} Quik • <a href="https://quik.id.vn" style="color:#2563eb;text-decoration:none;">quik.id.vn</a>
    </div>
  </div>
</body>
</html>
`.trim();
}

// ==================== TEMPLATES (BASIC) ====================

function renderRejectEmail({ reporterName, messageText, adminName, reason, reportDate }) {
  const content = `
    <p style="margin:0 0 12px;">Xin chào <b>${escapeHtml(reporterName)}</b>,</p>

    <p style="margin:0 0 12px;">
      Cảm ơn bạn đã gửi báo cáo vào ngày <b>${escapeHtml(reportDate)}</b>.
      Sau khi xem xét, chúng tôi chưa thấy dấu hiệu vi phạm từ nội dung được báo cáo.
    </p>

    <div style="margin:14px 0;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;">
      <div style="font-size:12px;color:#6b7280;margin-bottom:6px;">Tin nhắn được báo cáo</div>
      <div style="font-size:14px;color:#111;">"${escapeHtml(messageText)}"</div>
    </div>

    <div style="margin:14px 0;padding:12px;border-left:4px solid #9ca3af;background:#f9fafb;">
      <div style="font-size:14px;"><b>Kết quả:</b> Không vi phạm</div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px;">
        Ghi chú: ${escapeHtml(reason || "Đã kiểm tra và không thấy vi phạm.")}
      </div>
    </div>

    <p style="margin:0 0 6px;font-size:13px;color:#374151;">
      Xử lý bởi: <b>${escapeHtml(adminName)}</b>
    </p>
    <p style="margin:0;font-size:13px;color:#374151;">
      Ngày xử lý: <b>${escapeHtml(viDate())}</b>
    </p>
  `;

  return baseLayout({
    title: "Kết quả báo cáo: Không vi phạm",
    contentHtml: content,
  });
}

function renderApproveEmail({ reporterName, messageText, adminName, reason, reportDate, action }) {
  const actionText =
    action === "delete_and_ban"
      ? "Tin nhắn đã bị xóa và tài khoản vi phạm đã bị hạn chế."
      : "Tin nhắn đã bị xóa khỏi hệ thống.";

  const content = `
    <p style="margin:0 0 12px;">Xin chào <b>${escapeHtml(reporterName)}</b>,</p>

    <p style="margin:0 0 12px;">
      Cảm ơn bạn đã gửi báo cáo vào ngày <b>${escapeHtml(reportDate)}</b>.
      Sau khi xem xét, chúng tôi xác nhận nội dung <b>vi phạm quy định</b>.
    </p>

    <div style="margin:14px 0;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff7ed;">
      <div style="font-size:12px;color:#6b7280;margin-bottom:6px;">Tin nhắn vi phạm</div>
      <div style="font-size:14px;color:#111;">"${escapeHtml(messageText)}"</div>
    </div>

    <div style="margin:14px 0;padding:12px;border-left:4px solid #ef4444;background:#fef2f2;">
      <div style="font-size:14px;"><b>Hành động:</b> ${escapeHtml(actionText)}</div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px;">
        Lý do: ${escapeHtml(reason || "Vi phạm quy định cộng đồng.")}
      </div>
    </div>

    <p style="margin:0 0 6px;font-size:13px;color:#374151;">
      Xử lý bởi: <b>${escapeHtml(adminName)}</b>
    </p>
    <p style="margin:0;font-size:13px;color:#374151;">
      Ngày xử lý: <b>${escapeHtml(viDate())}</b>
    </p>
  `;

  return baseLayout({
    title: "Kết quả báo cáo: Đã xử lý vi phạm",
    contentHtml: content,
  });
}

// ==================== MAIN FUNCTION ====================

export async function sendReportResultEmail({
  reporterEmail,
  reporterName,
  messageText,
  action, // "delete_only" | "delete_and_ban" | "reject"
  adminName,
  reason,
  reportDate,
}) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY");
    }
    if (!reporterEmail) {
      throw new Error("Missing reporterEmail");
    }

    const safeMessage = truncateText(messageText, 160);
    const safeReportDate = reportDate || viDate();

    const isRejected = action === "reject";
    const subject = isRejected
      ? "Kết quả báo cáo: Không vi phạm"
      : "Kết quả báo cáo: Đã xử lý vi phạm";

    const html = isRejected
      ? renderRejectEmail({
          reporterName: reporterName || "bạn",
          messageText: safeMessage,
          adminName: adminName || "Admin",
          reason,
          reportDate: safeReportDate,
        })
      : renderApproveEmail({
          reporterName: reporterName || "bạn",
          messageText: safeMessage,
          adminName: adminName || "Admin",
          reason,
          reportDate: safeReportDate,
          action: action || "delete_only",
        });

    const data = await resend.emails.send({
      from: "Quik <admin@quik.id.vn>",
      to: [reporterEmail],
      subject,
      html,
    });

    return { success: true, data };
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    return { success: false, error: String(error?.message || error) };
  }
}

export default { sendReportResultEmail };
