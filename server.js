import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import multer from "multer";
import AWS from "aws-sdk";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(cors());
app.use(express.json());

// --- CONFIG CLOUDFLARE R2 ---
const s3 = new AWS.S3({
  endpoint: new AWS.Endpoint(`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`),
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  signatureVersion: "v4",
});

const upload = multer({ storage: multer.memoryStorage() });

// --- ROUTE UPLOAD FILE ---
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const fileName = `${Date.now()}-${file.originalname}`;
    await s3
      .putObject({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: "public-read",
      })
      .promise();

    const url = `${process.env.R2_PUBLIC_DOMAIN}/${fileName}`;
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// --- SOCKET.IO CHAT ---
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("sendMessage", (msg) => {
    io.emit("receiveMessage", msg);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
