import { createServer } from "http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { reconcileOrphanedRuns } from "./services/runRepository.service";

async function main() {
  await connectDB();
  console.log("Connected to MongoDB");

  const reconciled = await reconcileOrphanedRuns();
  if (reconciled > 0) {
    console.log(`Reconciled ${reconciled} run(s) orphaned by a previous process exit`);
  }

  // Socket.io's attach() snapshots whatever request listeners are already on
  // the http.Server, removes them, and re-installs itself as the sole
  // listener — delegating to the snapshotted ones for any request that
  // isn't its own /socket.io/* traffic. That only works if Express is
  // already attached *before* the Server is constructed: build io with no
  // server first (so createApp(io) can build routes that need it), then
  // create the http.Server with app as its listener, then attach io to it.
  // Attaching io before Express exists — or adding Express afterward via a
  // second .on("request", ...) — makes both fire independently for every
  // request and crash with ERR_HTTP_HEADERS_SENT once both try to respond.
  const io = new Server({ cors: { origin: env.clientOrigin } });
  const app = createApp(io);
  const httpServer = createServer(app);
  io.attach(httpServer);

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
