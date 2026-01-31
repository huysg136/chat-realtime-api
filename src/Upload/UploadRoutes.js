import express from "express";
import multer from "multer";
import { uploadController } from "./UploadController.js";

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.post("/api/get-upload-url", uploadController.getUploadUrl);
router.post("/upload", upload.single("file"), uploadController.uploadFile);

export default router;
