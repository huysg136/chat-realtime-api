import express from "express";
import multer from "multer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "./r2.js"; // AWS R2 client đã cấu hình
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// --- Cấu hình multer với giới hạn file ---
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB, có thể tăng giảm tùy nhu cầu
  },
});

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const key = `${Date.now()}-${file.originalname}`;
    const uploadParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await r2.send(new PutObjectCommand(uploadParams));

    const fileUrl = `${process.env.R2_PUBLIC_DOMAIN}/${key}`;
    res.json({ message: "File uploaded!", url: fileUrl });
  } catch (error) {
    console.error(error);
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File too large" });
    }
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
