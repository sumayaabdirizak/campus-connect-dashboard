import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HttpError } from "../utils/httpError.js";

const __agentLogPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../debug-b7cda9.log");

/**
 * Global Express error handler — consistent JSON for all API failures.
 * @type {import("express").ErrorRequestHandler}
 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (process.env.NODE_ENV !== "test") {
    console.error(err);
  }

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
      details: err.details ?? null,
    });
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`);
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      details,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // #region agent log
    fetch("http://127.0.0.1:7768/ingest/31870779-47f0-4312-b278-1c6da891de23", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b7cda9" },
      body: JSON.stringify({
        sessionId: "b7cda9",
        hypothesisId: "H_prisma_known",
        location: "errorHandler.js:PrismaClientKnownRequestError",
        message: String(err.message || "prisma_known"),
        data: {
          code: err.code,
          meta: err.meta ?? null,
          path: req.originalUrl,
          method: req.method,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    try {
      fs.appendFileSync(
        __agentLogPath,
        `${JSON.stringify({
          sessionId: "b7cda9",
          hypothesisId: "H_prisma_known",
          location: "errorHandler.js:PrismaClientKnownRequestError:file",
          message: String(err.message || "prisma_known"),
          data: {
            code: err.code,
            meta: err.meta ?? null,
            path: req.originalUrl,
            method: req.method,
          },
          timestamp: Date.now(),
        })}\n`,
      );
    } catch {
      /* ignore */
    }
    // #endregion
    if (err.code === "P2025") {
      return res.status(404).json({
        status: "error",
        message: "Record not found",
        details: process.env.NODE_ENV === "production" ? null : { code: err.code },
      });
    }
    if (err.code === "P2002") {
      return res.status(409).json({
        status: "error",
        message: "A record with this unique value already exists",
        details: process.env.NODE_ENV === "production" ? null : { meta: err.meta },
      });
    }
    // Column/table missing vs Prisma schema — usually pending `prisma migrate deploy`
    if (err.code === "P2022") {
      return res.status(503).json({
        status: "error",
        message: "Database schema is out of date. Apply migrations (e.g. npm run prisma:migrate:deploy in backend).",
        details: process.env.NODE_ENV === "production" ? null : { code: err.code, meta: err.meta },
      });
    }
  }

  const status =
    typeof err.statusCode === "number" && err.statusCode >= 400 && err.statusCode < 600
      ? err.statusCode
      : typeof err.status === "number"
        ? err.status
        : 500;

  const message =
    status === 500
      ? "Internal server error"
      : err.message || "Request failed";

  const details =
    status === 500 && process.env.NODE_ENV === "production"
      ? null
      : status === 500
        ? err.message
        : null;

  return res.status(status).json({
    status: "error",
    message,
    details,
  });
}
