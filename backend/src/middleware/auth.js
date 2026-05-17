// src/middleware/auth.js
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { apiErrorBody } from "../utils/apiEnvelope.js";

function readCookie(req, key) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const chunks = cookieHeader.split(";").map((entry) => entry.trim());
  for (const chunk of chunks) {
    const [name, ...rest] = chunk.split("=");
    if (name === key) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

export function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const bearerToken = header.startsWith("Bearer ") ? header.slice(7) : null;
  const cookieToken = readCookie(req, "auth_token");
  const token = bearerToken || cookieToken;

  if (!token) return res.status(401).json(apiErrorBody("Missing token", null));

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (payload.tokenType != null && payload.tokenType !== "access") {
      return res.status(401).json(apiErrorBody("Invalid token", null));
    }
    const facultyId = payload.facultyId ?? payload.faculty_id ?? null;
    req.user = {
      ...payload,
      facultyId,
      faculty_id: facultyId,
    };
    next();
  } catch {
    if (process.env.NODE_ENV !== "production") {
      console.debug("Auth middleware: token verification failed");
    }
    return res.status(401).json(apiErrorBody("Invalid token", null));
  }
}