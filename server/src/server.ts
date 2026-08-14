import { createServer } from "http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

async function main() {
  await connectDB();
  console.log("Connected to MongoDB");

  const app = createApp();
  // Socket.io needs to attach to the same underlying HTTP server as Express,
  // not run on a separate port — hence wrapping the app in a raw http.Server
  // instead of calling app.listen() directly.
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: env.clientOrigin },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(env.port, () => {
    console.log(`Claritas E2E API listening on port ${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
