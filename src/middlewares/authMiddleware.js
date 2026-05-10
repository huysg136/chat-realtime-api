import { admin } from "../config/firebase.js";

/**
 * Middleware để xác thực Firebase ID Token
 */
export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Vui lòng đăng nhập để thực hiện hành động này.",
    });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // Chứa uid, email, v.v.
    next();
  } catch (error) {
    console.error("Xác thực Token thất bại:", error);
    return res.status(401).json({
      success: false,
      message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    });
  }
};
