import { db } from "../config/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { AppError } from "../utils/AppError.js";
import { uploadService } from "../services/uploadService.js";

const FILE_SIZE_LIMIT = {
  free: 3 * 1024 * 1024,
  lite: 25 * 1024 * 1024,
  pro: 100 * 1024 * 1024,
  max: 200 * 1024 * 1024,
};

const QUOTA_LIMIT = {
  free: 50 * 1024 * 1024,
  lite: 2 * 1024 * 1024 * 1024,
  pro: 10 * 1024 * 1024 * 1024,
  max: 30 * 1024 * 1024 * 1024,
};

export class UploadController {
    async getUploadUrl(req, res, next) {
        try {
            const uid = req.user?.uid;
            const { fileName, fileType, folder, fileSize } = req.body;

            if (!fileSize || isNaN(fileSize) || fileSize <= 0) {
                return next(new AppError("Missing fileSize", 400));
            }

            // Lấy user từ Firestore
            const snapshot = await db.collection("users")
                .where("uid", "==", uid).limit(1).get();

            if (snapshot.empty) return next(new AppError("User not found", 404));

            const userData = snapshot.docs[0].data();
            const plan = userData.premiumLevel || "free";
            const quotaUsed = userData.quotaUsed || 0;
            const maxFileSize = FILE_SIZE_LIMIT[plan] ?? FILE_SIZE_LIMIT.free;
            const maxQuota = QUOTA_LIMIT[plan] ?? QUOTA_LIMIT.free;

            // Chặn tại đây
            if (fileSize > maxFileSize) {
                return next(new AppError(`File vượt giới hạn gói ${plan.toUpperCase()} (${maxFileSize / 1024 / 1024}MB)`, 400));
            }
            if (quotaUsed + fileSize > maxQuota) {
                return next(new AppError("Bạn đã hết dung lượng. Nâng cấp gói để tiếp tục.", 400));
            }

            const result = await uploadService.generatePresignedUrl(
                fileName, fileType, folder, fileSize, maxFileSize
            );

            // Tăng quota sau khi cấp URL
            await snapshot.docs[0].ref.update({
                quotaUsed: FieldValue.increment(Number(fileSize))
            });

            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    async uploadFile(req, res, next) {
        try {
            const result = await uploadService.uploadFile(req.file);
            res.json(result);
        } catch (err) {
            next(err);
        }
    }
}

export const uploadController = new UploadController();