/**
 * Best-effort discussion audit rows (A11). Failures are logged and swallowed
 * so moderation flows are never blocked by diagnostics persistence.
 */

function jsonSafe(value) {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
  } catch {
    return null;
  }
}

/**
 * @param {import("@prisma/client").PrismaClient} prismaClient
 * @param {{
 *   serverId: number,
 *   channelId?: number | null,
 *   actorUserId: number,
 *   action: string,
 *   targetType: string,
 *   targetId: number,
 *   before?: unknown,
 *   after?: unknown,
 * }} params
 */
export async function recordDiscussionAuditLog(prismaClient, params) {
  try {
    const serverId = Number(params.serverId);
    const actorUserId = Number(params.actorUserId);
    const targetId = Number(params.targetId);
    if (!Number.isInteger(serverId) || serverId <= 0) return;
    if (!Number.isInteger(actorUserId) || actorUserId <= 0) return;
    if (!Number.isInteger(targetId) || targetId < 0) return;

    const channelId =
      params.channelId == null || params.channelId === ""
        ? null
        : Number(params.channelId);
    const safeChannelId =
      channelId != null && Number.isInteger(channelId) && channelId > 0 ? channelId : null;

    await prismaClient.discussionAuditLog.create({
      data: {
        serverId,
        channelId: safeChannelId,
        actorUserId,
        action: String(params.action || "UNKNOWN").slice(0, 64),
        targetType: String(params.targetType || "UNKNOWN").slice(0, 32),
        targetId,
        before: jsonSafe(params.before) ?? undefined,
        after: jsonSafe(params.after) ?? undefined,
      },
    });
  } catch (err) {
    console.warn("recordDiscussionAuditLog failed", err?.message);
  }
}
