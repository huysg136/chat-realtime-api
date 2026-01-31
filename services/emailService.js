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

// Cải tiến bố cục Layout sạch sẽ và hiện đại hơn
function baseLayout({ title, contentHtml, isApprove = false }) {
  // Màu chủ đạo thay đổi theo trạng thái Duyệt/Từ chối
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
          
          <!-- Header -->
          <tr>
            <td style="padding:40px 40px 32px;text-align:center;border-bottom:1px solid #f1f5f9;">
              <img src="https://quik.id.vn/logo_quik.png" 
                   alt="Quik" 
                   width="64" 
                   style="display:block;margin:0 auto 16px;border-radius:12px;" />
              <div style="font-size:24px;font-weight:700;letter-spacing:-0.5px;color:#0f172a;">Quik</div>
              <div style="margin-top:8px;font-size:13px;font-weight:600;color:${brandColor};text-transform:uppercase;letter-spacing:1.2px;">
                ${escapeHtml(title)}
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 40px;background:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">
              <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">
                Đây là thông báo tự động từ hệ thống quản trị Quik.
              </p>
              <div style="margin-top:20px;padding-top:20px;border-top:1px solid #e2e8f0;">
                <a href="https://quik.id.vn" style="color:#0f172a;text-decoration:none;font-weight:600;font-size:14px;">quik.id.vn</a>
              </div>
            </td>
          </tr>

        </table>

        <!-- Copyright -->
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;margin-top:24px;">
          <tr>
            <td style="text-align:center;font-size:12px;color:#94a3b8;padding:0 20px;">
              © ${new Date().getFullYear()} Quik Inc. Bảo lưu mọi quyền.
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

// ==================== TEMPLATES ====================

function renderRejectEmail({ reporterName, messageText, adminName, reason, reportDate }) {
  const content = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
            Xin chào <strong>${escapeHtml(reporterName)}</strong>,
          </p>
        </td>
      </tr>
      <tr>
        <td>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#475569;">
            Cảm ơn bạn đã báo cáo nội dung vào ngày ${escapeHtml(reportDate)}. Sau khi đội ngũ quản trị xem xét, chúng tôi chưa tìm thấy bằng chứng vi phạm quy chuẩn cộng đồng.
          </p>
        </td>
      </tr>
      <tr>
        <td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:12px;margin-bottom:28px;">
            <tr>
              <td style="padding:20px;">
                <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:10px;letter-spacing:0.5px;">
                  Nội dung bạn đã báo cáo
                </div>
                <div style="font-size:15px;color:#1e293b;font-style:italic;line-height:1.5;">
                  "${escapeHtml(messageText)}"
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid #94a3b8;margin-bottom:28px;">
            <tr>
              <td style="padding-left:16px;">
                <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:6px;">
                  Kết quả: Giữ nguyên nội dung
                </div>
                <p style="margin:0;font-size:14px;color:#64748b;line-height:1.5;">
                  ${escapeHtml(reason || "Nội dung này không vi phạm chính sách của chúng tôi.")}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <div style="font-size:13px;color:#94a3b8;">
            Người duyệt: <strong>${escapeHtml(adminName)}</strong> • ${escapeHtml(viDate())}
          </div>
        </td>
      </tr>
    </table>
  `;

  return baseLayout({
    title: "Báo cáo không vi phạm",
    contentHtml: content,
    isApprove: false
  });
}

function renderApproveEmail({ reporterName, messageText, adminName, reason, reportDate, action }) {
  const actionText = action === "delete_and_ban" 
    ? "Xóa tin nhắn & Hạn chế tài khoản" 
    : "Đã xóa tin nhắn";

  const content = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
            Xin chào <strong>${escapeHtml(reporterName)}</strong>,
          </p>
        </td>
      </tr>
      <tr>
        <td>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#475569;">
            Dựa trên báo cáo ngày ${escapeHtml(reportDate)} của bạn, chúng tôi xác nhận nội dung dưới đây đã <strong>vi phạm quy định</strong> của Quik.
          </p>
        </td>
      </tr>
      <tr>
        <td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff1f2;border-radius:12px;border:1px solid #fecdd3;margin-bottom:28px;">
            <tr>
              <td style="padding:20px;">
                <div style="font-size:11px;font-weight:600;color:#be123c;text-transform:uppercase;margin-bottom:10px;letter-spacing:0.5px;">
                  Tin nhắn vi phạm
                </div>
                <div style="font-size:15px;color:#9f1239;font-style:italic;line-height:1.5;">
                  "${escapeHtml(messageText)}"
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid #ef4444;margin-bottom:28px;">
            <tr>
              <td style="padding-left:16px;">
                <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:6px;">
                  Hành động: ${escapeHtml(actionText)}
                </div>
                <p style="margin:0;font-size:14px;color:#64748b;line-height:1.5;">
                  Lý do: ${escapeHtml(reason || "Vi phạm tiêu chuẩn cộng đồng.")}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <div style="font-size:13px;color:#94a3b8;">
            Người duyệt: <strong>${escapeHtml(adminName)}</strong> • ${escapeHtml(viDate())}
          </div>
        </td>
      </tr>
    </table>
  `;

  return baseLayout({
    title: "Đã xử lý vi phạm",
    contentHtml: content,
    isApprove: true
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