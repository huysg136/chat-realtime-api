/**
 * Middleware xác thực API Key
 * Chỉ cho phép request có header x-api-key hợp lệ đi qua.
 * Frontend phải gửi kèm header này trong mọi request.
 */
export const apiKeyAuth = (req, res, next) => {
  const clientKey = req.headers["x-api-key"];
  const serverKey = process.env.API_SECRET_KEY;

  if (!serverKey) {
    console.error("⚠️  API_SECRET_KEY chưa được cấu hình trong .env");
    return res.status(500).json({ success: false, message: "Server configuration error." });
  }

  if (!clientKey || clientKey !== serverKey) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing API key.",
    });
  }

  next();
};
