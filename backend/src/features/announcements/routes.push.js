import express from "express";
import webpush from "web-push";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { auth } from "../../middleware/auth.js";
import { apiErrorBody } from "../../utils/apiEnvelope.js";
import { pushSubscribeRateLimit } from "../../middleware/perUserRateLimit.js";

const router = express.Router();

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@localhost";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

router.post("/subscribe", auth, pushSubscribeRateLimit, async (req, res) => {
  try {
    if (!configureWebPush()) {
      return res.status(503).json({ message: "Web Push not configured (VAPID keys missing)" });
    }
    const userId = Number(req.user.sub);
    const parsed = subscribeSchema.parse(req.body ?? {});
    const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null;
    await prisma.webPushSubscription.upsert({
      where: { endpoint: parsed.endpoint },
      create: {
        userId,
        endpoint: parsed.endpoint,
        p256dh: parsed.keys.p256dh,
        auth: parsed.keys.auth,
        userAgent,
      },
      update: {
        userId,
        p256dh: parsed.keys.p256dh,
        auth: parsed.keys.auth,
        userAgent,
      },
    });
    res.json({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", issues: e.issues });
    }
    res.status(500).json(apiErrorBody(e?.message || "Failed to save subscription", null));
  }
});

router.post("/unsubscribe", auth, async (req, res) => {
  try {
    const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : "";
    if (!endpoint) return res.status(400).json({ message: "endpoint required" });
    await prisma.webPushSubscription.deleteMany({
      where: { endpoint, userId: Number(req.user.sub) },
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json(apiErrorBody(e?.message || "Failed to remove subscription", null));
  }
});

router.get("/vapid-public-key", auth, (_req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) return res.status(503).json({ message: "VAPID not configured" });
  res.json({ publicKey });
});

export default router;
