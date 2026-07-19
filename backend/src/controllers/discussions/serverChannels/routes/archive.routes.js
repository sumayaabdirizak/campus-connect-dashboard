import express from "express";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import { getIo } from "../../../../socket/hub.js";
import { PERMISSION_BITS, requireChannelPermission } from "../../../../features/discussions/permissions.js";
import { recordDiscussionAuditLog } from "../../../../features/discussions/auditLog.js";
import { getDiscussionCallerUserId } from "../../../../features/discussions/discussionCaller.js";

const router = express.Router();

async function setArchiveState(req, res, archivedAt) {
  const channelId = req.discussionChannelId;
  const prior = await prisma.discussionChannel.findUnique({
    where: { id: channelId },
    select: { archivedAt: true, serverId: true },
  });
  if (!prior) return res.status(404).json(apiErrorBody("Channel not found", null));

  const channel = await prisma.discussionChannel.update({
    where: { id: channelId },
    data: { archivedAt },
    include: { category: true },
  });
  try {
    const io = getIo();
    if (io) io.to(`channel:${channelId}`).emit("channel:update", { channelId, channel });
  } catch (emitErr) {
    console.warn("channel:archive socket emit failed", emitErr?.message);
  }
  const actor = getDiscussionCallerUserId(req);
  if (actor) {
    await recordDiscussionAuditLog(prisma, {
      serverId: prior.serverId,
      channelId,
      actorUserId: actor,
      action: archivedAt ? "CHANNEL_ARCHIVE" : "CHANNEL_UNARCHIVE",
      targetType: "CHANNEL",
      targetId: channelId,
      before: { archivedAt: prior.archivedAt?.toISOString() ?? null },
      after: { archivedAt: channel.archivedAt?.toISOString() ?? null },
    });
  }
  return res.json({ channel });
}

router.post(
  "/channels/:channelId/archive",
  requireChannelPermission(PERMISSION_BITS.MANAGE_CHANNEL),
  async (req, res) => {
    try {
      return await setArchiveState(req, res, new Date());
    } catch (error) {
      console.error("POST /discussions/channels/:channelId/archive failed", error);
      return res.status(500).json(apiErrorBody("Failed to archive channel", null));
    }
  },
);

router.delete(
  "/channels/:channelId/archive",
  requireChannelPermission(PERMISSION_BITS.MANAGE_CHANNEL),
  async (req, res) => {
    try {
      return await setArchiveState(req, res, null);
    } catch (error) {
      console.error("DELETE /discussions/channels/:channelId/archive failed", error);
      return res.status(500).json(apiErrorBody("Failed to un-archive channel", null));
    }
  },
);

export default router;
