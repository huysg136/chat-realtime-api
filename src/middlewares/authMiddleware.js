import { admin, firebaseConfigError } from "../config/firebase.js";

let lastAuthDiagnostic = null;

const readTokenProject = (token) => {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).aud;
  } catch {
    return null;
  }
};

export const getAuthDiagnostic = () => lastAuthDiagnostic;

/**
 * Middleware để xác thực Firebase ID Token
 */
export const authMiddleware = async (req, res, next) => {
  if (firebaseConfigError) {
    return res.status(503).json({
      success: false,
      code: "FIREBASE_NOT_CONFIGURED",
      message: "Firebase Admin is not configured on the server.",
    });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    lastAuthDiagnostic = {
      verified: false,
      headerPresent: false,
      checkedAt: new Date().toISOString(),
    };
    return res.status(401).json({
      success: false,
      code: "AUTH_HEADER_MISSING",
      message: "Vui lòng đăng nhập để thực hiện hành động này.",
    });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    lastAuthDiagnostic = {
      verified: true,
      headerPresent: true,
      tokenProject: decodedToken.aud,
      checkedAt: new Date().toISOString(),
    };
    req.user = decodedToken; // Chứa uid, email, v.v.
    next();
  } catch (error) {
    lastAuthDiagnostic = {
      verified: false,
      headerPresent: true,
      tokenProject: readTokenProject(idToken),
      errorCode: error.code || null,
      errorMessage: error.message,
      checkedAt: new Date().toISOString(),
    };
    console.error("Xác thực Token thất bại:", error);
    return res.status(401).json({
      success: false,
      code: "INVALID_FIREBASE_TOKEN",
      message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      ...(process.env.NODE_ENV !== "production" && {
        detail: error.code || error.message,
      }),
    });
  }
};
