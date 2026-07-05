import express from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { apiErrorBody } from "../../utils/apiEnvelope.js";
import {
  requireActiveDiscussionMembership,
  canManageDiscussionGroup,
} from "../../features/discussions/discussionMembership.js";
import { publishEpochSchema } from "../../features/discussions/validation/groupDiscussionSchemas.js";

const router = express.Router();

router.get("/groups/:groupId/e2e/keys", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = Number(req.user?.sub);
    const deviceId = String(req.query?.deviceId || "");
    const fromVersion = req.query?.fromVersion ? Number(req.query.fromVersion) : null;
    if (!Number.isFinite(groupId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
    if (!deviceId) {
      return res.status(400).json(apiErrorBody("deviceId query param is required", null));
    }
    const membership = await requireActiveDiscussionMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    const device = await prisma.discussionDeviceKey.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
      select: { userId: true, deviceId: true, revokedAt: true },
    });
    if (!device || device.revokedAt) {
      return res.status(403).json(apiErrorBody("Device key is not active", null));
    }

    const envelopes = await prisma.discussionGroupKeyEnvelope.findMany({
      where: {
        groupId,
        userId,
        deviceId,
        ...(Number.isFinite(fromVersion) ? { keyVersion: { gt: fromVersion } } : {}),
      },
      orderBy: [{ keyVersion: "asc" }, { createdAt: "asc" }],
    });
    return res.json({
      groupId,
      currentKeyVersion: membership.group?.e2eeCurrentKeyVersion ?? 1,
      rotationRequired: membership.group?.e2eeRotationRequired ?? false,
      envelopes,
    });
  } catch (error) {
    console.error("GET /discussions/groups/:groupId/e2e/keys failed", error);
    return res.status(500).json(apiErrorBody("Failed to fetch E2E keys", null));
  }
});

router.post("/groups/:groupId/e2e/epochs", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
    const membership = await requireActiveDiscussionMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    if (!canManageDiscussionGroup(membership)) {
      return res.status(403).json(apiErrorBody("Only moderators can publish group key epochs", null));
    }
    const parsed = publishEpochSchema.parse(req.body ?? {});

    const memberIds = await prisma.discussionGroupMembership.findMany({
      where: { groupId, leftAt: null, isActive: true },
      select: { userId: true },
    });
    const memberIdSet = new Set(memberIds.map((x) => Number(x.userId)));
    for (const env of parsed.envelopes) {
      if (!memberIdSet.has(Number(env.userId))) {
        return res
          .status(400)
          .json(apiErrorBody(`Envelope user ${env.userId} is not an active group member`, null));
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const created = await Promise.all(
        parsed.envelopes.map((env) =>
          tx.discussionGroupKeyEnvelope.upsert({
            where: {
              groupId_keyVersion_userId_deviceId: {
                groupId,
                keyVersion: parsed.keyVersion,
                userId: env.userId,
                deviceId: env.deviceId,
              },
            },
            create: {
              groupId,
              keyVersion: parsed.keyVersion,
              userId: env.userId,
              deviceId: env.deviceId,
              encryptedKey: env.encryptedKey,
              nonce: env.nonce ?? null,
              algorithm: parsed.algorithm,
            },
            update: {
              encryptedKey: env.encryptedKey,
              nonce: env.nonce ?? null,
              algorithm: parsed.algorithm,
            },
          })
        )
      );

      await tx.discussionGroup.update({
        where: { id: groupId },
        data: {
          e2eeCurrentKeyVersion: parsed.keyVersion,
          e2eeRotationRequired: false,
        },
      });
      return created.length;
    });

    return res.status(201).json({
      groupId,
      keyVersion: parsed.keyVersion,
      publishedEnvelopes: result,
      rotationReason: parsed.rotationReason ?? null,
    });
  } catch (error) {
    console.error("POST /discussions/groups/:groupId/e2e/epochs failed", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to publish E2E key epoch", null));
  }
});
export default router;
