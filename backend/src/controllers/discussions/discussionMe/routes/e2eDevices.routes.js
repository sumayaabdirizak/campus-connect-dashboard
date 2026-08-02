import express from "express";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import { registerDeviceSchema } from "../../../../validation/groupDiscussionSchemas.js";

const router = express.Router();

router.post("/me/e2e/devices", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const parsed = registerDeviceSchema.parse(req.body ?? {});
    const fingerprint = crypto
      .createHash("sha256")
      .update(`${parsed.algorithm}:${parsed.publicKey}`)
      .digest("hex");
    const row = await prisma.discussionDeviceKey.upsert({
      where: { userId_deviceId: { userId, deviceId: parsed.deviceId } },
      create: {
        userId,
        deviceId: parsed.deviceId,
        publicKey: parsed.publicKey,
        algorithm: parsed.algorithm,
        fingerprint,
      },
      update: {
        publicKey: parsed.publicKey,
        algorithm: parsed.algorithm,
        fingerprint,
        revokedAt: null,
        lastSeenAt: new Date(),
      },
      select: {
        id: true,
        userId: true,
        deviceId: true,
        algorithm: true,
        fingerprint: true,
        createdAt: true,
      },
    });
    return res.status(201).json(row);
  } catch (error) {
    console.error("POST /discussions/me/e2e/devices failed", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to register device key", null));
  }
});

export default router;
