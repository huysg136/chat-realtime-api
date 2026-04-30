import { uploadService } from "../services/uploadService.js";

export class UploadController {
    async getUploadUrl(req, res, next) {
        try {
            const { fileName, fileType, folder } = req.body;
            const result = await uploadService.generatePresignedUrl(fileName, fileType, folder);
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
