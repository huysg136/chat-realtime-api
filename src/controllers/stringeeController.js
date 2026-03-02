import { stringeeService } from "../services/stringeeService.js";
import { AppError } from "../utils/AppError.js";

export class StringeeController {
    getClientToken(req, res, next) {
        try {
            const { uid } = req.query;
            if (!uid) {
                throw new AppError("Missing uid parameter", 400);
            }

            const { token, expiresIn } = stringeeService.generateClientToken(uid);

            res.json({
                access_token: token,
                expires_in: expiresIn,
                userId: uid,
            });
        } catch (err) {
            next(err);
        }
    }

    getRestToken(req, res, next) {
        try {
            const token = stringeeService.generateRestToken();

            res.json({
                access_token: token,
                expires_in: 3600,
            });
        } catch (err) {
            next(err);
        }
    }

    async createRoom(req, res, next) {
        try {
            const { roomName } = req.body;
            if (!roomName) {
                throw new AppError("Missing roomName", 400);
            }

            const room = await stringeeService.createRoom(roomName);
            res.json(room);
        } catch (err) {
            next(err);
        }
    }

    getRoomToken(req, res, next) {
        try {
            const { roomId, userId } = req.body;
            if (!roomId) throw new AppError("Missing roomId", 400);
            if (!userId) throw new AppError("Missing userId", 400);

            const { token, expiresIn } = stringeeService.generateRoomToken(roomId, userId);

            res.json({
                roomId,
                userId,
                roomToken: token,
                expires_in: expiresIn,
            });
        } catch (err) {
            next(err);
        }
    }

    async listRooms(req, res, next) {
        try {
            const rooms = await stringeeService.listRooms();
            res.json(rooms);
        } catch (err) {
            next(err);
        }
    }
}

export const stringeeController = new StringeeController();
