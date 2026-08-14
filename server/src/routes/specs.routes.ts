import { Router } from "express";
import { discoverSpecs } from "../services/specDiscovery.service";

export const specsRouter = Router();

specsRouter.get("/", async (_req, res, next) => {
  try {
    const specs = await discoverSpecs();
    res.json({ specs });
  } catch (err) {
    next(err);
  }
});
