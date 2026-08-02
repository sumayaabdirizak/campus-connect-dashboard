import express from "express";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import { PERMISSION_BITS, requireChannelPermission } from "../../../../services/discussions/permissions.js";
import { filterMembershipRowsByChannelScope } from "../../../../services/discussions/channelScopeAccess.js";
import { getDiscussionCallerUserId } from "../../../../services/discussions/discussionCaller.js";

const router = express.Router();

router.get(
  "/channels/:channelId/members",
  requireChannelPermission(PERMISSION_BITS.VIEW_CHANNEL),
  async (req, res) => {
    try {
      const channelId = req.discussionChannelId;
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));

      const channel = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: { serverId: true, scopeType: true, scopeId: true },
      });
      if (!channel) return res.status(404).json(apiErrorBody("Channel not found", null));

      const memberRows = await prisma.discussionGroupMembership.findMany({
        where: { groupId: channel.serverId, leftAt: null, isActive: true },
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
              email: true,
              number: true,
              status: true,
              role: { select: { name: true } },
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      });
      const rows = await filterMembershipRowsByChannelScope(memberRows, channel);
      const results = rows.map((r) => ({
        userId: r.userId,
        role: r.role,
        canPost: r.canPost,
        canModerate: r.canModerate,
        joinedAt: r.joinedAt,
        user: r.user
          ? {
              id: r.user.id,
              full_name: r.user.full_name,
              email: r.user.email,
              number: r.user.number,
              status: r.user.status,
              role: r.user.role?.name ?? null,
            }
          : null,
      }));
      return res.json({ results });
    } catch (error) {
      console.error("GET /discussions/channels/:channelId/members failed", error);
      return res.status(500).json(apiErrorBody("Failed to list channel members", null));
    }
  },
);

export default router;
