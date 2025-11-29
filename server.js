import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

app.post("/api/stringee/create-room", async (req, res) => {
  try {
    const { roomName } = req.body;
    const ACCESS_TOKEN = req.headers["x-access-token"];
    if (!ACCESS_TOKEN) {
      return res.status(400).json({ error: "Missing X-ACCESS-TOKEN header" });
    }

    const response = await fetch("https://api.stringee.com/v1/room2/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-STRINGEE-AUTH": ACCESS_TOKEN,
      },
      body: JSON.stringify({
        name: roomName || "default_room",
        uniqueName: roomName || "default_room",
      }),
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error("Stringee create-room error:", err);
    res.status(500).json({ error: "Failed to create room" });
  }
});

app.post("/api/stringee/generate-room-token", (req, res) => {
  const { roomId } = req.body;

  if (!roomId) return res.status(400).json({ error: "Missing roomId" });

  const apiKeySid = process.env.STRINGEE_API_KEY_SID;
  const apiKeySecret = process.env.STRINGEE_API_KEY_SECRET;

  const payload = {
    jti: apiKeySid + "-" + Date.now(),
    iss: apiKeySid,
    exp: Math.floor(Date.now() / 1000) + 3600, 
    roomId: roomId,
    permissions: {
      publish: true,
      subscribe: true,
      control_room: true,
    },
  };

  const token = jwt.sign(payload, apiKeySecret, { algorithm: "HS256" });

  res.json({
    roomId,
    roomToken: token,
  });
});

app.get("/api/stringee/token", (req, res) => {
  const apiKeySid = process.env.STRINGEE_API_KEY_SID;
  const apiKeySecret = process.env.STRINGEE_API_KEY_SECRET;
  const { uid } = req.query; 

  if (!apiKeySid || !apiKeySecret) {
    return res.status(500).json({ error: "Missing Stringee API keys" });
  }

  if (!uid) {
    return res.status(400).json({ error: "Missing uid" });
  }

  const payload = {
    jti: apiKeySid + "-" + Date.now(),  // token ID
    iss: apiKeySid,                      // API key SID
    exp: Math.floor(Date.now() / 1000) + 3600, // sống 1h
    userId: uid                          // <=== bắt buộc cho Web SDK
  };

  const token = jwt.sign(payload, apiKeySecret, { algorithm: "HS256" });

  res.json({ access_token: token });
});



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
    console.error("❌ Error calling Gemini:", err);
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
    console.log("Available models:", JSON.stringify(data, null, 2));
    res.json(data);
  } catch (err) {
    console.error("Error listing models:", err);
    res.status(500).json({ error: err.message });
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  socket.on("sendMessage", (msg) => io.emit("receiveMessage", msg));
  socket.on("disconnect", () => console.log("User disconnected:", socket.id));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));