import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { healthRouter } from "./routes/health.routes";
import { specsRouter } from "./routes/specs.routes";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin }));
  if (env.nodeEnv !== "test") {
    app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
  }
  app.use(express.json());

  app.use("/api/health", healthRouter);
  app.use("/api/specs", specsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
