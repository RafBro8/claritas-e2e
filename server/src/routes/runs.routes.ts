import { Router } from "express";
import type { Server } from "socket.io";
import { startRun, stopRun, getActiveRuns } from "../services/testRunner.service";
import { AppError } from "../middleware/errorHandler";
import type { Environment } from "../types";

export function createRunsRouter(io: Server): Router {
  const router = Router();

  router.post("/start", async (req, res, next) => {
    try {
      const { specIds, environment, headless, socketId } = req.body ?? {};

      if (!Array.isArray(specIds) || specIds.length === 0 || !specIds.every((id) => typeof id === "string")) {
        throw new AppError(400, "specIds must be a non-empty array of strings");
      }
      if (environment !== "local" && environment !== "live") {
        throw new AppError(400, 'environment must be "local" or "live"');
      }
      if (typeof headless !== "boolean") {
        throw new AppError(400, "headless must be a boolean");
      }
      if (typeof socketId !== "string" || !socketId) {
        throw new AppError(400, "socketId is required");
      }

      const result = await startRun(
        { specIds, environment: environment as Environment, headless, socketId },
        io,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post("/:id/stop", (req, res) => {
    const stopped = stopRun(req.params.id);
    if (!stopped) {
      res.status(404).json({ error: "No active run with that id" });
      return;
    }
    res.json({ stopped: true });
  });

  router.get("/active", (_req, res) => {
    res.json({ runs: getActiveRuns() });
  });

  return router;
}
