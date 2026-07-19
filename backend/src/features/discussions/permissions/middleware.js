import { hasPermission } from "./bitHelpers.js";
import { computeChannelPermissions } from "./computeChannelPermissions.js";
import { computeServerPermissions } from "./computeServerPermissions.js";

export function requireChannelPermission(permissionBit, paramName = "channelId") {
  const bit = BigInt(permissionBit);
  return async function requireChannelPermissionMiddleware(req, res, next) {
    try {
      const userId = Number(req.user?.id ?? req.user?.sub);
      if (!Number.isInteger(userId) || userId <= 0)
        return res.status(401).json({ error: "Unauthorized" });
      const rawId = req.params[paramName];
      const channelId = Number(rawId);
      if (!Number.isInteger(channelId) || channelId <= 0) {
        return res.status(400).json({ error: "Invalid channel id" });
      }
      const perms = await computeChannelPermissions({ userId, channelId });
      if (!hasPermission(perms, bit)) {
        return res.status(403).json({ error: "Forbidden", code: "DISCUSSION_PERMISSION_DENIED" });
      }
      req.discussionChannelPermissions = perms;
      req.discussionChannelId = channelId;
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
      const serverId = Number(req.params[paramName]);
      if (!Number.isInteger(serverId) || serverId <= 0) {
        return res.status(400).json({ error: "Invalid server id" });
      }
      const perms = await computeServerPermissions({ userId, serverId });
      if (!hasPermission(perms, bit)) {
        return res.status(403).json({ error: "Forbidden", code: "DISCUSSION_PERMISSION_DENIED" });
      }
      req.discussionServerPermissions = perms;
      req.discussionServerId = serverId;
      next();
    } catch (err) {
      next(err);
    }
  };
}
