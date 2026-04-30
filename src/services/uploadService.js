import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config, r2Client } from "../config/index.js";
import { AppError } from "../utils/AppError.js";

export class UploadService {
    async generatePresignedUrl(fileName, fileType, folder = "uploads") {
        if (!fileName || !fileType) {
            throw new AppError("Missing fileName or fileType", 400);
        }

        const key = `${folder}/${Date.now()}_${fileName}`;

        const command = new PutObjectCommand({
            Bucket: config.r2.bucket,
            Key: key,
            ContentType: fileType,
        });

        try {
            const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });
            const fileUrl = `${config.r2.publicDomain}/${key}`;
            return { uploadUrl, fileUrl };
        } catch (err) {
            throw new AppError("Failed to generate upload URL", 500);
        }
    }

    async uploadFile(file) {
        if (!file) throw new AppError("No file uploaded", 400);

        const key = `${Date.now()}-${file.originalname}`;

        try {
            await r2Client.send(
                new PutObjectCommand({
                    Bucket: config.r2.bucket,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                })
            );

            const fileUrl = `${config.r2.publicDomain}/${key}`;
            return { url: fileUrl };
        } catch (err) {
            if (err.code === "LIMIT_FILE_SIZE") {
                throw new AppError("File too large", 413);
            }
            throw new AppError("Upload failed", 500);
        }
    }
}

export const uploadService = new UploadService();
