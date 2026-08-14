import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import type { Server } from "socket.io";
import { env } from "./config/env";
import { REPORTS_DIR } from "./config/paths";
import { healthRouter } from "./routes/health.routes";
import { specsRouter } from "./routes/specs.routes";
import { createRunsRouter } from "./routes/runs.routes";
import { historyRouter } from "./routes/history.routes";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

export function createApp(io: Server) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin }));
  if (env.nodeEnv !== "test") {
    app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
  }
  app.use(express.json());

  app.use("/api/health", healthRouter);
  app.use("/api/specs", specsRouter);
  app.use("/api/runs", createRunsRouter(io));
  app.use("/api/history", historyRouter);
  app.use("/api/reports", express.static(REPORTS_DIR));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
