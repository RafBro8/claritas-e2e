import { Router } from "express";
import { listRecentRuns, getRunStats } from "../services/runRepository.service";

export const historyRouter = Router();

historyRouter.get("/", async (_req, res, next) => {
  try {
    const [runs, stats] = await Promise.all([listRecentRuns(), getRunStats()]);
    res.json({ runs, stats });
  } catch (err) {
    next(err);
  }
});
