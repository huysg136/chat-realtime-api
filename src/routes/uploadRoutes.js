import express from "express";
import multer from "multer";
import { uploadController } from "../controllers/uploadController.js";
import { uploadLimiter } from "../middlewares/rateLimiter.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Upload: 10/min
router.post("/api/get-upload-url", uploadLimiter, authMiddleware, uploadController.getUploadUrl.bind(uploadController));
router.post("/upload", uploadLimiter, upload.single("file"), uploadController.uploadFile.bind(uploadController));

export default router;
