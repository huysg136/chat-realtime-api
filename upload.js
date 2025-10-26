// server.js hoặc upload.js
import express from "express";
import multer from "multer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "./r2.js"; // import client R2 đã cấu hình
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 0.001 * 1024 * 1024 } // 1MB
});

// Route upload file
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const uploadParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: `${Date.now()}-${file.originalname}`,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await r2.send(new PutObjectCommand(uploadParams));

    const fileUrl = `${process.env.R2_PUBLIC_DOMAIN}/${uploadParams.Key}`;
    res.json({ message: "File uploaded!", url: fileUrl });

  } catch (error) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Max 10MB allowed." });
    }

    console.error(error);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File too large. Max 10MB allowed." });
  }
  next(err);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
