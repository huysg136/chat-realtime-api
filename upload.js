import express from "express";
import multer from "multer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "./r2.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("file"), async (req, res) => {
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
    console.error(error);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
