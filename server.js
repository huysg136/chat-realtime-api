import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { config } from "./src/Config/index.js";
import { globalErrorHandler } from "./src/Exception/globalErrorHandler.js";

// routes
import stringeeRoutes from "./src/Stringee/StringeeRoutes.js";
import uploadRoutes from "./src/Upload/UploadRoutes.js";
import aiRoutes from "./src/AI/AIRoutes.js";
import reportRoutes from "./src/Reports/ReportsRoutes.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// middleware
app.use(cors());
app.use(express.json());
// routes
app.use("/api/stringee", stringeeRoutes);
app.use(uploadRoutes);
app.use("/api", aiRoutes);
app.use("/api/reports", reportRoutes);
app.use(globalErrorHandler);

const PORT = config.port;
server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
