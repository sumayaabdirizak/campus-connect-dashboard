import express from "express";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import {
  PERMISSION_BITS,
  requireChannelPermission,
} from "../../../../services/discussions/permissions.js";
import { toChannelDto } from "../../../../controllers/discussions/serverShared.js";

const router = express.Router();

router.get("/channels/:channelId", requireChannelPermission(PERMISSION_BITS.VIEW_CHANNEL), async (req, res) => {
  try {
    const channelId = req.discussionChannelId;
    const channel = await prisma.discussionChannel.findUnique({
      where: { id: channelId },
      include: { category: true, server: { select: { publicId: true } } },
    });
    if (!channel) return res.status(404).json(apiErrorBody("Channel not found", null));

    let conversationTitle = null;
    if (channel.legacyGroupId != null) {
      const legacy = await prisma.discussionGroup.findUnique({
        where: { id: channel.legacyGroupId },
        select: { name: true },
      });
      conversationTitle = legacy?.name ?? null;
    }

    const categoryMap = channel.category ? new Map([[channel.category.id, channel.category.publicId]]) : null;
    const { server, category: _category, ...channelRow } = channel;
    return res.json({
      channel: { ...toChannelDto(channelRow, server.publicId, categoryMap), conversationTitle },
      myPermissions: req.discussionChannelPermissions.toString(),
    });
  } catch (error) {
    console.error("GET /discussions/channels/:channelId failed", error);
    return res.status(500).json(apiErrorBody("Failed to load channel", null));
  }
});

export default router;
