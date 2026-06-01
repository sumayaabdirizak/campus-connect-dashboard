import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { HttpError } from "../utils/httpError.js";

/**
 * Global Express error handler — consistent JSON for all API failures.
 *
 * Security note: this file used to ship every Prisma error (with full
 * request paths + method + meta) to a hard-coded localhost ingestion
 * endpoint and write the same payload to `debug-b7cda9.log`. That was
 * agent-instrumentation debris and has been removed in the Sprint 5
 * security pass — every error response is now logged ONLY via
 * `console.error` (gated on NODE_ENV !== "test"). If you need temporary
 * forensics, prefer attaching a real logger (Pino/Winston) rather than
 * hard-coded fetch URLs.
 *
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
