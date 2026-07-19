import express from "express";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import {
  PERMISSION_BITS,
  requireChannelPermission,
} from "../../../../features/discussions/permissions.js";

const router = express.Router();

router.get("/channels/:channelId", requireChannelPermission(PERMISSION_BITS.VIEW_CHANNEL), async (req, res) => {
  try {
    const channelId = req.discussionChannelId;
    const channel = await prisma.discussionChannel.findUnique({
      where: { id: channelId },
      include: { category: true },
    });
    if (!channel) return res.status(404).json(apiErrorBody("Channel not found", null));
    return res.json({
      channel,
      myPermissions: req.discussionChannelPermissions.toString(),
    });
  } catch (error) {
    console.error("GET /discussions/channels/:channelId failed", error);
    return res.status(500).json(apiErrorBody("Failed to load channel", null));
  }
});

export default router;
