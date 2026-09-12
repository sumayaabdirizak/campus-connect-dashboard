import { prisma } from "../../../db/prisma.js";
import { hasPermission } from "./bitHelpers.js";
import { computeChannelPermissions } from "./computeChannelPermissions.js";
import { computeServerPermissions } from "./computeServerPermissions.js";
import { whereFromPublicId } from "../publicIdResolution.js";

export function requireChannelPermission(permissionBit, paramName = "channelId") {
  const bit = BigInt(permissionBit);
  return async function requireChannelPermissionMiddleware(req, res, next) {
    try {
      const userId = Number(req.user?.id ?? req.user?.sub);
      if (!Number.isInteger(userId) || userId <= 0)
        return res.status(401).json({ error: "Unauthorized" });
      const where = whereFromPublicId(req.params[paramName]);
      if (!where) {
        return res.status(400).json({ error: "Invalid channel id" });
      }
      const row = await prisma.discussionChannel.findUnique({
        where,
        select: { id: true, publicId: true },
      });
      if (!row) {
        return res.status(400).json({ error: "Invalid channel id" });
      }
      const channelId = row.id;
      const perms = await computeChannelPermissions({ userId, channelId });
      if (!hasPermission(perms, bit)) {
        return res.status(403).json({ error: "Forbidden", code: "DISCUSSION_PERMISSION_DENIED" });
      }
      req.discussionChannelPermissions = perms;
      req.discussionChannelId = channelId;
      req.discussionChannelPublicId = row.publicId;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireServerPermission(permissionBit, paramName = "serverId") {
  const bit = BigInt(permissionBit);
  return async function requireServerPermissionMiddleware(req, res, next) {
    try {
      const userId = Number(req.user?.id ?? req.user?.sub);
      if (!Number.isInteger(userId) || userId <= 0)
        return res.status(401).json({ error: "Unauthorized" });
      const where = whereFromPublicId(req.params[paramName]);
      if (!where) {
        return res.status(400).json({ error: "Invalid server id" });
      }
      const row = await prisma.discussionGroup.findUnique({
        where,
        select: { id: true, publicId: true },
      });
      if (!row) {
        return res.status(400).json({ error: "Invalid server id" });
      }
      const serverId = row.id;
      const perms = await computeServerPermissions({ userId, serverId });
      if (!hasPermission(perms, bit)) {
        return res.status(403).json({ error: "Forbidden", code: "DISCUSSION_PERMISSION_DENIED" });
      }
      req.discussionServerPermissions = perms;
      req.discussionServerId = serverId;
      req.discussionServerPublicId = row.publicId;
      next();
    } catch (err) {
      next(err);
    }
  };
}
