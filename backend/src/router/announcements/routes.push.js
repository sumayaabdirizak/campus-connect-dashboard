import express from "express";
import webpush from "web-push";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { pushSubscribeRateLimit } from "../../middleware/perUserRateLimit.js";
import { validateZod } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = express.Router();

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@localhost";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

router.post(
  "/subscribe",
  pushSubscribeRateLimit,
  validateZod(subscribeSchema),
  asyncHandler(async (req, res) => {
    if (!configureWebPush()) {
      return res.status(503).json({ message: "Web Push not configured (VAPID keys missing)" });
    }
    const userId = Number(req.user.sub);
    const parsed = req.body;
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
  })
);

router.post(
  "/unsubscribe",
  validateZod(unsubscribeSchema),
  asyncHandler(async (req, res) => {
    const { endpoint } = req.body;
    await prisma.webPushSubscription.deleteMany({
      where: { endpoint, userId: Number(req.user.sub) },
    });
    res.json({ success: true });
  })
);

router.get("/vapid-public-key", (_req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) return res.status(503).json({ message: "VAPID not configured" });
  res.json({ publicKey });
});

export default router;
