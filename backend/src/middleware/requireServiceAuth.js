import crypto from "crypto";
import { env } from "../config/env.js";
import { apiErrorBody } from "../utils/apiEnvelope.js";

/**
 * Gate for server-to-server integration calls (e.g. the university's SIS
 * calling into Campus Connect). These callers have no user session/cookie,
 * so they authenticate with a shared API key instead of `auth`/JWT.
 *
 * Header: `X-Integration-Api-Key: <key>`
 */
export function requireServiceAuth(req, res, next) {
  const configuredKey = env.INTEGRATION_API_KEY;
  if (!configuredKey) {
    // Fail closed — an unset key must never mean "integration is open".
    return res.status(503).json(apiErrorBody("Integration API is not configured", null));
  }

  const providedKey = req.headers["x-integration-api-key"];
  if (!providedKey || typeof providedKey !== "string") {
    return res.status(401).json(apiErrorBody("Missing integration API key", null));
  }

  const a = Buffer.from(providedKey);
  const b = Buffer.from(configuredKey);
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!valid) {
    return res.status(401).json(apiErrorBody("Invalid integration API key", null));
  }

  req.integrationClient = { source: "university-sis" };
  next();
}
