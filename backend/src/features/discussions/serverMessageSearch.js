import { prisma } from "../../db/prisma.js";
import { filterMembershipRowsByChannelScope } from "./channelScopeAccess.js";

/**
 * Resolves search-filter query params into a Prisma `where` fragment + summary.
 */
export async function resolveServerMessageSearchFilters({
  query,
  serverId,
  channel,
  prismaClient = prisma,
}) {
  const where = {};
  const summary = {};

  const fromRaw = typeof query.from === "string" ? query.from.trim() : "";
  if (fromRaw) {
    summary.from = fromRaw;
    const handle = fromRaw.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (handle) {
      let memberRows = await prismaClient.discussionGroupMembership.findMany({
        where: { groupId: Number(serverId), leftAt: null, isActive: true },
        select: {
          userId: true,
          user: { select: { full_name: true, number: true } },
        },
      });
      if (channel) {
        memberRows = await filterMembershipRowsByChannelScope(memberRows, channel, prismaClient);
      }
      const ids = memberRows
        .filter((m) => {
          const num = String(m.user?.number || "").toLowerCase();
          if (num && num === handle) return true;
          const first = String(m.user?.full_name || "")
            .trim()
            .split(/\s+/)[0]
            ?.replace(/[^\w]/g, "")
            .toLowerCase();
          return first && first === handle;
        })
        .map((m) => Number(m.userId));
      if (ids.length === 0) {
        return { where: { id: -1 }, summary, empty: true };
      }
      where.senderId = { in: ids };
    }
  }

  const hasRaw = typeof query.has === "string" ? query.has.trim().toLowerCase() : "";
  if (hasRaw === "image" || hasRaw === "video" || hasRaw === "file") {
    summary.has = hasRaw;
    where.attachments = {
      some: { fileType: hasRaw === "file" ? { in: ["FILE", "VIDEO"] } : hasRaw.toUpperCase() },
    };
  } else if (hasRaw === "attachment") {
    summary.has = "attachment";
    where.attachments = { some: {} };
  }

  const beforeRaw = typeof query.before === "string" ? query.before : "";
  if (beforeRaw) {
    const d = new Date(beforeRaw);
    if (!Number.isNaN(d.getTime())) {
      summary.before = d.toISOString();
      where.createdAt = { ...(where.createdAt ?? {}), lt: d };
    }
  }
  const afterRaw = typeof query.after === "string" ? query.after : "";
  if (afterRaw) {
    const d = new Date(afterRaw);
    if (!Number.isNaN(d.getTime())) {
      summary.after = d.toISOString();
      where.createdAt = { ...(where.createdAt ?? {}), gte: d };
    }
  }

  return { where, summary, empty: false };
}
