import { db } from "../config/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { AppError } from "../utils/AppError.js";
import { uploadService } from "../services/uploadService.js";

const PLAN_LIMITS = {
  free:    5  * 1024 * 1024,
  basic:   20 * 1024 * 1024,
  premium: 100 * 1024 * 1024,
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
            const maxSize = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

            // Chặn tại đây
            if (fileSize > maxSize) {
                return next(new AppError(`File vượt giới hạn gói ${plan.toUpperCase()} (${maxSize / 1024 / 1024}MB)`, 400));
            }
            if (quotaUsed + fileSize > maxSize) {
                return next(new AppError("Bạn đã hết dung lượng. Nâng cấp gói để tiếp tục.", 400));
            }

            const result = await uploadService.generatePresignedUrl(
                fileName, fileType, folder, fileSize, maxSize
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