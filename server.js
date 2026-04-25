import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { config } from "./src/config/index.js";
import { globalErrorHandler } from "./src/middlewares/errorHandler.js";

// routes
import stringeeRoutes from "./src/routes/stringeeRoutes.js";
import uploadRoutes from "./src/routes/uploadRoutes.js";
import aiRoutes from "./src/routes/aiRoutes.js";
import reportRoutes from "./src/routes/reportsRoutes.js";
import usersRoutes from "./src/routes/usersRoutes.js";

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
app.use("/api/users", usersRoutes);
app.use(globalErrorHandler);

const PORT = config.port;
server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
