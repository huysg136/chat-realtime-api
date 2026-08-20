import http from "node:http";

import app from "./app.js";
import { config } from "./config/index.js";

const server = http.createServer(app);

server.listen(config.port, () => {
  console.log(`Server started on port ${config.port}`);
});

export default server;
