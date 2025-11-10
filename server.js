import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

// --- Multer setup ---
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// --- Cloudflare R2 setup ---
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// --- Upload route ---
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

// --- Gemini Bot route ---
app.post("/api/ask-gemini", async (req, res) => {
  const { prompt } = req.body;
  
  console.log("📥 Prompt:", prompt);
  
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  const API_KEY = process.env.GEMINI_API_KEY;
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          maxOutputTokens: 200
        })
      }
    );

    const data = await response.json();
    
    console.log("📩 Response:", JSON.stringify(data, null, 2));

    if (data.error) {
      console.error("❌ Error:", data.error);
      return res.status(400).json({ error: data.error.message });
    }

    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!answer) {
      console.error("⚠️ No answer");
      return res.status(500).json({ error: "No response from Gemini" });
    }

    console.log("✅ Answer:", answer);
    res.json({ answer });

  } catch (err) {
    console.error("❌ Error:", err);
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

// --- Socket.IO chat ---
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  socket.on("sendMessage", (msg) => io.emit("receiveMessage", msg));
  socket.on("disconnect", () => console.log("User disconnected:", socket.id));
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));