import express from "express";
import multer from "multer";
import { uploadController } from "../controllers/uploadController.js";

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.post("/api/get-upload-url", uploadController.getUploadUrl.bind(uploadController));
router.post("/upload", upload.single("file"), uploadController.uploadFile.bind(uploadController));

export default router;
