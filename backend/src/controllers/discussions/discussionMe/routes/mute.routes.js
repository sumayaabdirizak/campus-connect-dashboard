import express from "express";
import { z } from "zod";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import { requireActiveDiscussionMembership } from "../../../../features/discussions/discussionMembership.js";
import { muteBodySchema } from "../../../../features/discussions/validation/groupDiscussionSchemas.js";

const router = express.Router();

router.get("/me/groups/muted", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const rows = await prisma.discussionMuteSetting.findMany({
      where: { userId },
      include: {
        group: {
          select: { id: true, name: true, groupKey: true, scopeType: true, scopeId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const results = rows.map((r) => ({
      groupId: r.groupId,
      until: r.until,
      createdAt: r.createdAt,
      group: r.group,
    }));
    return res.json({ results });
  } catch (error) {
    console.error("GET /discussions/me/groups/muted failed", error);
    return res.status(500).json(apiErrorBody("Failed to list muted groups", null));
  }
});

router.post("/me/groups/:groupId/mute", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const groupId = Number(req.params.groupId);
    if (!Number.isFinite(groupId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
    const membership = await requireActiveDiscussionMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    const parsed = muteBodySchema.parse(req.body ?? {});
    const until = parsed.until ? new Date(parsed.until) : null;
    if (until && Number.isNaN(until.getTime())) {
      return res.status(400).json(apiErrorBody("Invalid until datetime", null));
    }
    const row = await prisma.discussionMuteSetting.upsert({
      where: { userId_groupId: { userId, groupId } },
      create: { userId, groupId, until },
      update: { until },
    });
    return res.status(200).json({ ok: true, groupId, until: row.until, createdAt: row.createdAt });
  } catch (error) {
    console.error("POST /discussions/me/groups/:groupId/mute failed", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to mute group", null));
  }
});

router.delete("/me/groups/:groupId/mute", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const groupId = Number(req.params.groupId);
    if (!Number.isFinite(groupId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
    const membership = await requireActiveDiscussionMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    const result = await prisma.discussionMuteSetting.deleteMany({ where: { userId, groupId } });
    return res.json({ ok: true, deletedCount: result.count });
  } catch (error) {
    console.error("DELETE /discussions/me/groups/:groupId/mute failed", error);
    return res.status(500).json(apiErrorBody("Failed to unmute group", null));
  }
});

export default router;
