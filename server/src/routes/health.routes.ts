import { Router } from "express";
import mongoose from "mongoose";

export const healthRouter = Router();

async function databaseReachable(): Promise<boolean> {
  try {
    const db = mongoose.connection.db;
    if (!db) return false;
    await Promise.race([
      db.admin().command({ ping: 1 }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("ping timed out")), 4000),
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Readiness, as opposed to liveness.
 *
 * /health above answers "is this process running", which is the question
 * Render asks to decide whether a deploy came up, and which Playwright asks
 * to decide whether the server is ready for a suite. It has to keep
 * answering 200 while the database is still connecting, or a good deploy
 * gets marked failed and a test run never starts.
 *
 * This one answers the question a monitor actually cares about: can the app
 * reach its database right now. It pings rather than reading the driver's
 * own connection flag, because the flag says what the driver believes and a
 * ping says what is true. Down means 503, so an ordinary HTTP check catches
 * it without needing keyword matching.
 */
healthRouter.get("/ready", async (_req, res) => {
  const ready = await databaseReachable();
  res
    .status(ready ? 200 : 503)
    .set("Cache-Control", "no-store, max-age=0")
    .json({ ok: ready });
});

healthRouter.get("/", (_req, res) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});
