import jwt from "jsonwebtoken";
import { config } from "../Config/index.js";
import { AppError } from "../Exception/globalErrorHandler.js";

const HEADER = {
    typ: "JWT",
    alg: "HS256",
    cty: "stringee-api;v=1",
};

export class StringeeService {
    generateClientToken(uid) {
        if (!config.stringee.sid || !config.stringee.secret) {
            throw new AppError("Server configuration error: Missing Stringee credentials", 500);
        }

        const now = Math.floor(Date.now() / 1000);
        const apiKeySid = config.stringee.sid;
        const apiKeySecret = config.stringee.secret;

        const payload = {
            jti: `${apiKeySid}-${Date.now()}`,
            iss: apiKeySid,
            exp: now + 3600,
            userId: uid,
        };

        const token = jwt.sign(payload, apiKeySecret, {
            algorithm: "HS256",
            header: HEADER,
        });

        return { token, expiresIn: 3600 };
    }

    generateRestToken() {
        if (!config.stringee.sid || !config.stringee.secret) {
            throw new AppError("Server configuration error: Missing Stringee credentials", 500);
        }

        const now = Math.floor(Date.now() / 1000);
        const apiKeySid = config.stringee.sid;
        const apiKeySecret = config.stringee.secret;

        const payload = {
            jti: `${apiKeySid}-${Date.now()}`,
            iss: apiKeySid,
            exp: now + 3600,
            rest_api: true,
        };

        return jwt.sign(payload, apiKeySecret, {
            algorithm: "HS256",
            header: HEADER,
        });
    }

    async createRoom(roomName) {
        const restToken = this.generateRestToken();

        const response = await fetch("https://api.stringee.com/v1/room2/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-STRINGEE-AUTH": restToken,
            },
            body: JSON.stringify({
                name: roomName,
                uniqueName: roomName,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new AppError(data.message || "Failed to create room", response.status);
        }

        return data;
    }

    generateRoomToken(roomId, userId) {
        if (!config.stringee.sid || !config.stringee.secret) {
            throw new AppError("Server configuration error: Missing Stringee credentials", 500);
        }

        const now = Math.floor(Date.now() / 1000);
        const apiKeySid = config.stringee.sid;
        const apiKeySecret = config.stringee.secret;

        const payload = {
            jti: `${apiKeySid}-${Date.now()}`,
            iss: apiKeySid,
            exp: now + 3600,
            roomId: roomId,
            userId: userId,
            permissions: {
                publish: true,
                subscribe: true,
                control_room: true,
            },
        };

        const token = jwt.sign(payload, apiKeySecret, {
            algorithm: "HS256",
            header: HEADER,
        });

        return { token, expiresIn: 3600 };
    }

    async getRoomToken(req, res, next) {
        try {
            const { roomId, uid } = req.body;
            
            if (!roomId || !uid) {
                throw new AppError("roomId and uid are required", 400);
            }

            const result = stringeeService.generateRoomToken(roomId, uid);
            res.json({ room_token: result.token, expiresIn: result.expiresIn });
        } catch (error) {
            next(error);
        }
    }

    async listRooms() {
        const restToken = this.generateRestToken();

        const response = await fetch("https://api.stringee.com/v1/room2/list", {
            method: "GET",
            headers: {
                "X-STRINGEE-AUTH": restToken,
            },
        });

        const data = await response.json();
        return data;
    }
}

export const stringeeService = new StringeeService();
