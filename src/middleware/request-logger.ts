import type { RequestHandler } from "express";
import { env } from "../config/env.js";

export const requestLogger: RequestHandler = (req, res, next) => {
  if (!env.LOG_REQUESTS || env.NODE_ENV === "test") {
    next();
    return;
  }

  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    console.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      ip: req.ip
    });
  });

  next();
};

