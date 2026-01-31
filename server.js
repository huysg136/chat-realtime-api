import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import reportRoutes from './routes/reportRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());


// ============= STRINGEE VIDEO CALL API =============

/**
 * Generate Stringee Access Token for Client Connection (Call2 API)
 * Docs: https://developer.stringee.com/docs/client-authentication
 * Method: GET
 * Endpoint: /api/stringee/token?uid=USER_ID
 */
app.get("/api/stringee/token", (req, res) => {
  try {
    const apiKeySid = process.env.STRINGEE_API_KEY_SID;
    const apiKeySecret = process.env.STRINGEE_API_KEY_SECRET;
    const { uid } = req.query;

    // Validation
    if (!apiKeySid || !apiKeySecret) {
      console.error("❌ Missing Stringee API credentials");
      return res.status(500).json({ 
        error: "Server configuration error" 
      });
    }

    if (!uid) {
      return res.status(400).json({ error: "Missing uid parameter" });
    }

    // Remove any whitespace
    const cleanApiKeySid = apiKeySid.trim();
    const cleanApiKeySecret = apiKeySecret.trim();

    console.log("\n===== GENERATING STRINGEE ACCESS TOKEN =====");
    console.log("API Key SID:", cleanApiKeySid);
    console.log("Secret Key (first 20):", cleanApiKeySecret.substring(0, 20) + "...");
    console.log("Secret Key (last 5):", "..." + cleanApiKeySecret.substring(cleanApiKeySecret.length - 5));
    console.log("User ID:", uid);

    const now = Math.floor(Date.now() / 1000);
    
    // JWT Payload according to Stringee specs
    // Must include: jti, iss, exp, userId
    const payload = {
      jti: `${cleanApiKeySid}-${Date.now()}`,  // JWT ID (unique identifier)
      iss: cleanApiKeySid,                      // Issuer (API Key SID)
      exp: now + 3600,                          // Expiration (1 hour)
      userId: uid                               // User identifier (REQUIRED)
    };

    console.log("Payload:", JSON.stringify(payload, null, 2));

    // Sign with HS256 and proper header
    const token = jwt.sign(payload, cleanApiKeySecret, { 
      algorithm: "HS256",
      header: {
        typ: "JWT",
        alg: "HS256",
        cty: "stringee-api;v=1"
      }
    });

    console.log("✅ Token generated");
    console.log("Token (50 chars):", token.substring(0, 50) + "...");
    console.log("===========================================\n");

    res.json({ 
      access_token: token,
      expires_in: 3600,
      userId: uid
    });

  } catch (err) {
    console.error("❌ Token generation error:", err);
    res.status(500).json({ 
      error: "Failed to generate token",
      message: err.message 
    });
  }
});

/**
 * Generate REST API Access Token (for Room management)
 * This is different from client access token
 * Method: POST
 * Endpoint: /api/stringee/rest-token
 */
app.post("/api/stringee/rest-token", (req, res) => {
  try {
    const apiKeySid = process.env.STRINGEE_API_KEY_SID?.trim();
    const apiKeySecret = process.env.STRINGEE_API_KEY_SECRET?.trim();

    if (!apiKeySid || !apiKeySecret) {
      return res.status(500).json({ error: "Missing API credentials" });
    }

    const now = Math.floor(Date.now() / 1000);
    
    // REST API token doesn't need userId
    const payload = {
      jti: `${apiKeySid}-${Date.now()}`,
      iss: apiKeySid,
      exp: now + 3600,
      rest_api: true
    };

    const token = jwt.sign(payload, apiKeySecret, { 
      algorithm: "HS256",
      header: {
        typ: "JWT",
        alg: "HS256",
        cty: "stringee-api;v=1"
      }
    });

    console.log("✅ REST API token generated");

    res.json({ 
      access_token: token,
      expires_in: 3600
    });

  } catch (err) {
    console.error("❌ REST token error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create Stringee Video Room
 * Method: POST
 * Endpoint: /api/stringee/create-room
 * Body: { roomName: string }
 */
app.post("/api/stringee/create-room", async (req, res) => {
  try {
    const { roomName } = req.body;
    
    if (!roomName) {
      return res.status(400).json({ error: "Missing roomName" });
    }

    // Generate REST API token
    const apiKeySid = process.env.STRINGEE_API_KEY_SID?.trim();
    const apiKeySecret = process.env.STRINGEE_API_KEY_SECRET?.trim();

    if (!apiKeySid || !apiKeySecret) {
      return res.status(500).json({ error: "Missing API credentials" });
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      jti: `${apiKeySid}-${Date.now()}`,
      iss: apiKeySid,
      exp: now + 3600,
      rest_api: true
    };

    const restToken = jwt.sign(payload, apiKeySecret, { 
      algorithm: "HS256",
      header: {
        typ: "JWT",
        alg: "HS256",
        cty: "stringee-api;v=1"
      }
    });

    // Call Stringee API to create room
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
      console.error("Stringee API error:", data);
      return res.status(response.status).json(data);
    }

    console.log("✅ Room created:", data);
    res.json(data);

  } catch (err) {
    console.error("❌ Create room error:", err);
    res.status(500).json({ error: "Failed to create room" });
  }
});

/**
 * Generate Room Token for joining a specific room
 * Method: POST
 * Endpoint: /api/stringee/generate-room-token
 * Body: { roomId: string, userId: string }
 */
app.post("/api/stringee/generate-room-token", (req, res) => {
  try {
    const { roomId, userId } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: "Missing roomId" });
    }

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const apiKeySid = process.env.STRINGEE_API_KEY_SID?.trim();
    const apiKeySecret = process.env.STRINGEE_API_KEY_SECRET?.trim();

    if (!apiKeySid || !apiKeySecret) {
      return res.status(500).json({ error: "Missing API credentials" });
    }

    const now = Math.floor(Date.now() / 1000);

    // Room token payload
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
      header: {
        typ: "JWT",
        alg: "HS256",
        cty: "stringee-api;v=1"
      }
    });

    console.log("✅ Room token generated");
    console.log("   Room ID:", roomId);
    console.log("   User ID:", userId);

    res.json({
      roomId,
      userId,
      roomToken: token,
      expires_in: 3600
    });

  } catch (err) {
    console.error("❌ Room token error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * List all rooms
 * Method: GET
 * Endpoint: /api/stringee/list-rooms
 */
app.get("/api/stringee/list-rooms", async (req, res) => {
  try {
    const apiKeySid = process.env.STRINGEE_API_KEY_SID?.trim();
    const apiKeySecret = process.env.STRINGEE_API_KEY_SECRET?.trim();

    if (!apiKeySid || !apiKeySecret) {
      return res.status(500).json({ error: "Missing API credentials" });
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      jti: `${apiKeySid}-${Date.now()}`,
      iss: apiKeySid,
      exp: now + 3600,
      rest_api: true
    };

    const restToken = jwt.sign(payload, apiKeySecret, { 
      algorithm: "HS256",
      header: {
        typ: "JWT",
        alg: "HS256",
        cty: "stringee-api;v=1"
      }
    });

    const response = await fetch("https://api.stringee.com/v1/room2/list", {
      method: "GET",
      headers: {
        "X-STRINGEE-AUTH": restToken,
      },
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error("❌ List rooms error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============= FILE UPLOAD (R2) =============

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

app.post("/api/get-upload-url", async (req, res) => {
  try {
    const { fileName, fileType } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({ error: "Missing fileName or fileType" });
    }

    const key = `uploads/${Date.now()}_${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    // Tạo presigned URL có hiệu lực 5 phút
    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });
    const fileUrl = `${process.env.R2_PUBLIC_DOMAIN}/${key}`;

    console.log("✅ Presigned URL generated:", key);

    res.json({ uploadUrl, fileUrl });
  } catch (err) {
    console.error("❌ Presigned URL error:", err);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const key = `${Date.now()}-${file.originalname}`;
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    const fileUrl = `${process.env.R2_PUBLIC_DOMAIN}/${key}`;
    res.json({ url: fileUrl });
  } catch (err) {
    console.error(err);
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File too large" });
    }
    res.status(500).json({ error: "Upload failed" });
  }
});

app.post("/api/ask-groq", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  const API_KEY = process.env.GROQ_API_KEY;

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }]
        })
      }
    );

    const data = await response.json();

    // Handle rate limit specifically
    if (response.status === 429) {
      return res.status(429).json({ 
        error: "Rate limit exceeded",
        code: "RATE_LIMIT_EXCEEDED"
      });
    }

    if (data.error) {
      return res.status(400).json({ 
        error: data.error.message,
        code: data.error.code || "API_ERROR"
      });
    }

    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      return res.status(500).json({ 
        error: "No response from Groq",
        code: "EMPTY_RESPONSE"
      });
    }

    res.json({ answer });
  } catch (err) {
    console.error("❌ Groq error:", err);
    res.status(500).json({ 
      error: err.message,
      code: "INTERNAL_ERROR"
    });
  }
});

// ============= GEMINI AI API =============

app.post("/api/ask-gemini", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  const API_KEY = process.env.GEMINI_API_KEY;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    const answer = data.candidates?.[0]?.content?.parts
      ?.map(p => p.text)
      .join("\n");

    if (!answer) return res.status(500).json({ error: "No response from Gemini" });

    res.json({ answer });
  } catch (err) {
    console.error("❌ Gemini error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/list-models", async (req, res) => {
  const API_KEY = process.env.GEMINI_API_KEY;
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error listing models:", err);
    res.status(500).json({ error: err.message });
  }
});

app.use("/api/reports", reportRoutes)

// ============= SOCKET.IO =============

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);
  socket.on("sendMessage", (msg) => io.emit("receiveMessage", msg));
  socket.on("disconnect", () => console.log("❌ User disconnected:", socket.id));
});

// ============= SERVER START =============

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚀 SERVER STARTED`);
  console.log(`${'='.repeat(50)}`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🎥 Stringee Video Call: READY`);
  console.log(`💬 Socket.IO: READY`);
  console.log(`\n⚙️  Configuration Check:`);
  console.log(`   ✓ Stringee SID: ${process.env.STRINGEE_API_KEY_SID || '❌ NOT SET'}`);
  console.log(`   ${process.env.STRINGEE_API_KEY_SECRET ? '✓' : '❌'} Secret Key: ${process.env.STRINGEE_API_KEY_SECRET ? 'SET' : 'NOT SET'}`);
  console.log(`${'='.repeat(50)}\n`);
});