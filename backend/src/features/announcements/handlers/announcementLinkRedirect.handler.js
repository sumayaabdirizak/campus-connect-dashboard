import rateLimit from "express-rate-limit";
import { prisma } from "../../../db/prisma.js";
import {
  decodeAnnouncementRedirectToken,
  parseAllowedRedirectUrl,
} from "../services/announcementLinkRedirect.service.js";
import { invalidateAnnouncementAnalyticsCache } from "../services/announcementAnalytics.service.js";

export const announcementLinkRedirectLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.ANNOUNCEMENT_LINK_REDIRECT_RATE_LIMIT_PER_MIN ?? 45),
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Maximum stored length for `AnnouncementLinkClick.url`. We refuse to log a
 * click whose normalized URL exceeds this length rather than silently
 * truncating — a truncated URL can be a *different valid URL*, which would
 * record misleading data and could even point to an unintended origin.
 */
const MAX_REDIRECT_URL_STORAGE_LEN = 8000;

/**
 * Public GET `/api/r/:announcementId/:token` — logs `AnnouncementLinkClick` then 302 to target URL.
 * @type {import("express").RequestHandler}
 */
export async function announcementLinkRedirectHandler(req, res) {
  const announcementId = Number.parseInt(String(req.params.announcementId), 10);
  const rawToken = String(req.params.token ?? "");
  if (!Number.isFinite(announcementId) || !rawToken) {
    return res.status(404).type("text/plain").send("Not found");
  }

  let token = rawToken;
  try {
    token = decodeURIComponent(rawToken);
  } catch {
    token = rawToken;
  }

  const decoded = decodeAnnouncementRedirectToken(token);
  if (!decoded || decoded.announcementId !== announcementId) {
    return res.status(404).type("text/plain").send("Not found");
  }

  const target = parseAllowedRedirectUrl(decoded.targetUrl);
  if (!target) {
    return res.status(404).type("text/plain").send("Not found");
  }

  // Validate length BEFORE storing/redirecting: a URL whose normalized form
  // exceeds the storage column would otherwise be silently sliced, producing
  // a click row whose recorded URL differs (potentially pointing at a
  // different origin) from where the user was actually sent.
  const finalHref = target.href;
  if (finalHref.length > MAX_REDIRECT_URL_STORAGE_LEN) {
    return res.status(404).type("text/plain").send("Not found");
  }

  try {
    await prisma.announcementLinkClick.create({
      data: {
        announcementId,
        userId: decoded.userId,
        url: finalHref,
      },
    });
    invalidateAnnouncementAnalyticsCache(announcementId);
  } catch {
    // logging must not block redirect
  }

  return res.redirect(302, finalHref);
}
