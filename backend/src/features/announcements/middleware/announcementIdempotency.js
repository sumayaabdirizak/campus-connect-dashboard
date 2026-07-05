import {
  readIdempotentResponse,
  writeIdempotentResponse,
} from "../services/announcementIdempotency.service.js";
import { announcementLog } from "../announcementLogger.js";

/** @type {import("express").RequestHandler} */
export async function announcementIdempotencyPost(req, res, next) {
  try {
    const key = req.get("Idempotency-Key");
    if (!key || key.length > 128) return next();
    const prev = await readIdempotentResponse(key);
    if (prev) {
      res.set("Idempotency-Replayed", "true");
      return res.status(prev.status).json(prev.body);
    }
    const origJson = res.json.bind(res);
    res.json = (body) => {
      writeIdempotentResponse(key, res.statusCode, body).catch(() => {});
      return origJson(body);
    };
    next();
  } catch (err) {
    announcementLog("warn", "announcement.idempotency_middleware_failed", {
      message: err?.message ?? String(err),
    });
    next();
  }
}
