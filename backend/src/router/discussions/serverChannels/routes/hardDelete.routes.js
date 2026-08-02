import express from "express";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import { getIo } from "../../../../socket/hub.js";
import {
  PERMISSION_BITS,
  computeServerPermissions,
  hasPermission,
  requireChannelPermission,
} from "../../../../services/discussions/permissions.js";
import { recordDiscussionAuditLog } from "../../../../services/discussions/auditLog.js";
import { getDiscussionCallerUserId } from "../../../../services/discussions/discussionCaller.js";

const router = express.Router();

router.delete(
  "/channels/:channelId",
  requireChannelPermission(PERMISSION_BITS.MANAGE_CHANNEL),
  async (req, res) => {
    try {
      const channelId = req.discussionChannelId;
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));

      const channel = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: {
          id: true,
          publicId: true,
          serverId: true,
          server: { select: { publicId: true } },
          archivedAt: true,
          isDefault: true,
          name: true,
          slug: true,
        },
      });
      if (!channel) return res.status(404).json(apiErrorBody("Channel not found", null));
      if (channel.isDefault) {
        return res.status(400).json(apiErrorBody("The default channel cannot be deleted", null));
      }
      if (!channel.archivedAt) {
        return res
          .status(400)
          .json(apiErrorBody("Archive the channel before you can delete it permanently", null));
      }

      const serverPerms = await computeServerPermissions({ userId, serverId: channel.serverId });
      if (!hasPermission(serverPerms, PERMISSION_BITS.MANAGE_SERVER)) {
        return res
          .status(403)
          .json(
            apiErrorBody("You need Manage Server permission to permanently delete a channel", null),
          );
      }

      await recordDiscussionAuditLog(prisma, {
        serverId: channel.serverId,
        channelId,
        actorUserId: userId,
        action: "CHANNEL_HARD_DELETE",
        targetType: "CHANNEL",
        targetId: channelId,
        before: { name: channel.name, slug: channel.slug },
        after: null,
      });

      await prisma.discussionChannel.delete({ where: { id: channelId } });

      try {
        const io = getIo();
        if (io) {
          io.to(`channel:${channelId}`).emit("channel:update", {
            channelId: channel.publicId,
            serverId: channel.server.publicId,
            deleted: true,
          });
          io.to(`discussion:group:${channel.serverId}`).emit("server:channelsChanged", {
            serverId: channel.server.publicId,
            channelId: channel.publicId,
          });
        }
      } catch (emitErr) {
        console.warn("channel:hard-delete socket emit failed", emitErr?.message);
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("DELETE /discussions/channels/:channelId failed", error);
      return res.status(500).json(apiErrorBody("Failed to delete channel", null));
    }
  },
);

export default router;
