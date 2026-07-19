import express from "express";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import { PERMISSION_BITS, requireChannelPermission } from "../../../../features/discussions/permissions.js";
import { getDiscussionCallerUserId } from "../../../../features/discussions/discussionCaller.js";
import { patchChannelSchema } from "../../../../features/discussions/validation/serverSchemas.js";
import {
  emitPatchChannelUpdate,
  normalizePatchTopic,
  recordPatchChannelAudit,
  resolvePatchCategory,
  resolvePatchPosition,
} from "./patch.helpers.js";

const router = express.Router();

router.patch(
  "/channels/:channelId",
  requireChannelPermission(PERMISSION_BITS.MANAGE_CHANNEL),
  async (req, res) => {
    try {
      const channelId = req.discussionChannelId;
      const parsed = patchChannelSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json(apiErrorBody("Invalid request body", parsed.error.issues));
      }
      let { name, topic, categoryId, position, kind, isPrivate, slowModeSeconds } = parsed.data;
      if (
        name === undefined &&
        topic === undefined &&
        categoryId === undefined &&
        position === undefined &&
        kind === undefined &&
        isPrivate === undefined &&
        slowModeSeconds === undefined
      ) {
        return res
          .status(400)
          .json(
            apiErrorBody(
              "Provide name, topic, categoryId, position, kind, isPrivate, or slowModeSeconds to update",
              null,
            ),
          );
      }
      if (topic !== undefined && topic !== null) {
        const normalized = normalizePatchTopic(topic);
        if (normalized?.error) {
          return res.status(400).json(apiErrorBody(normalized.error, null));
        }
        topic = normalized;
      }

      const existing = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: {
          id: true,
          serverId: true,
          categoryId: true,
          position: true,
          isDefault: true,
          archivedAt: true,
          name: true,
          topic: true,
          kind: true,
          isPrivate: true,
          slowModeSeconds: true,
        },
      });
      if (!existing) return res.status(404).json(apiErrorBody("Channel not found", null));
      if (existing.archivedAt) {
        return res.status(410).json(apiErrorBody("Channel is archived", null));
      }
      if (isPrivate === true && existing.isDefault) {
        return res
          .status(400)
          .json(
            apiErrorBody(
              "The default channel cannot be made private. Promote another channel to default first.",
              null,
            ),
          );
      }

      const categoryResult = await resolvePatchCategory(categoryId, existing);
      if (categoryResult.error) {
        return res.status(400).json(apiErrorBody(categoryResult.error, null));
      }
      const nextCategoryId =
        categoryId !== undefined ? categoryResult.categoryId : existing.categoryId;
      const nextPosition = await resolvePatchPosition({
        position,
        categoryId,
        nextCategoryId,
        existing,
        channelId,
      });

      const data = {};
      if (name !== undefined) data.name = name;
      if (topic !== undefined) data.topic = topic;
      if (categoryId !== undefined) data.categoryId = nextCategoryId;
      if (nextPosition !== undefined) data.position = nextPosition;
      if (kind !== undefined) data.kind = kind;
      if (isPrivate !== undefined) data.isPrivate = isPrivate;
      if (slowModeSeconds !== undefined) data.slowModeSeconds = slowModeSeconds;

      const channel = await prisma.discussionChannel.update({
        where: { id: channelId },
        data,
        include: { category: true },
      });

      await emitPatchChannelUpdate({
        channelId,
        channel,
        existing,
        categoryId,
        nextPosition,
        isPrivate,
        slowModeSeconds,
      });

      await recordPatchChannelAudit({
        actorUserId: getDiscussionCallerUserId(req),
        existing,
        channel,
        channelId,
        fields: { name, topic, categoryId, nextPosition, kind, isPrivate, slowModeSeconds },
      });

      return res.json({
        channel,
        myPermissions: req.discussionChannelPermissions.toString(),
      });
    } catch (error) {
      console.error("PATCH /discussions/channels/:channelId failed", error);
      return res.status(500).json(apiErrorBody("Failed to update channel", null));
    }
  },
);

export default router;
