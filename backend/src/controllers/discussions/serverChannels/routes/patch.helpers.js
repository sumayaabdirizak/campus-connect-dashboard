import { prisma } from "../../../../db/prisma.js";
import { getIo } from "../../../../socket/hub.js";
import { recordDiscussionAuditLog } from "../../../../services/discussions/auditLog.js";
import { whereFromPublicId } from "../../../../services/discussions/publicIdResolution.js";

export function normalizePatchTopic(topic) {
  if (topic === undefined || topic === null) return topic;
  const t = String(topic).trim();
  if (t.length > 1024) return { error: "topic exceeds 1024 characters" };
  return t === "" ? null : t;
}

export async function resolvePatchCategory(categoryId, existing) {
  if (categoryId === undefined) return { categoryId: existing.categoryId };
  if (categoryId === null) return { categoryId: null };
  const where = whereFromPublicId(categoryId);
  if (!where) return { error: "categoryId does not belong to this server" };
  const cat = await prisma.discussionChannelCategory.findFirst({
    where,
    select: { id: true, serverId: true },
  });
  if (!cat || cat.serverId !== existing.serverId) {
    return { error: "categoryId does not belong to this server" };
  }
  return { categoryId: cat.id };
}

export async function resolvePatchPosition({ position, categoryId, nextCategoryId, existing, channelId }) {
  let nextPosition = position;
  const categoryChanged = categoryId !== undefined && nextCategoryId !== existing.categoryId;
  if (nextPosition === undefined && categoryChanged) {
    const last = await prisma.discussionChannel.findFirst({
      where: {
        serverId: existing.serverId,
        categoryId: nextCategoryId,
        archivedAt: null,
        id: { not: channelId },
      },
      orderBy: [{ position: "desc" }, { id: "desc" }],
      select: { position: true },
    });
    nextPosition = last ? last.position + 1 : 0;
  }
  return nextPosition;
}

export async function emitPatchChannelUpdate({
  channelId,
  channel,
  channelDto,
  serverPublicId,
  existing,
  categoryId,
  nextPosition,
  isPrivate,
  slowModeSeconds,
}) {
  try {
    const io = getIo();
    if (!io) return;
    io.to(`channel:${channelId}`).emit("channel:update", { channelId: channelDto.id, channel: channelDto });
    if (
      categoryId !== undefined ||
      nextPosition !== undefined ||
      isPrivate !== undefined ||
      slowModeSeconds !== undefined
    ) {
      io.to(`discussion:group:${existing.serverId}`).emit("server:channelsChanged", {
        serverId: serverPublicId,
        channelId: channelDto.id,
      });
    }
  } catch (emitErr) {
    console.warn("channel:update socket emit failed", emitErr?.message);
  }
}

export async function recordPatchChannelAudit({
  actorUserId,
  existing,
  channel,
  channelId,
  fields,
}) {
  if (!actorUserId) return;
  const { name, topic, categoryId, nextPosition, kind, isPrivate, slowModeSeconds } = fields;
  const beforePayload = {};
  const afterPayload = {};
  if (name !== undefined) {
    beforePayload.name = existing.name;
    afterPayload.name = channel.name;
  }
  if (topic !== undefined) {
    beforePayload.topic = existing.topic;
    afterPayload.topic = channel.topic;
  }
  if (categoryId !== undefined) {
    beforePayload.categoryId = existing.categoryId;
    afterPayload.categoryId = channel.categoryId;
  }
  if (nextPosition !== undefined) {
    beforePayload.position = existing.position;
    afterPayload.position = channel.position;
  }
  if (kind !== undefined) {
    beforePayload.kind = existing.kind;
    afterPayload.kind = channel.kind;
  }
  if (isPrivate !== undefined) {
    beforePayload.isPrivate = existing.isPrivate;
    afterPayload.isPrivate = channel.isPrivate;
  }
  if (slowModeSeconds !== undefined) {
    beforePayload.slowModeSeconds = existing.slowModeSeconds;
    afterPayload.slowModeSeconds = channel.slowModeSeconds;
  }
  if (Object.keys(beforePayload).length === 0) return;
  await recordDiscussionAuditLog(prisma, {
    serverId: existing.serverId,
    channelId,
    actorUserId,
    action: "CHANNEL_UPDATE",
    targetType: "CHANNEL",
    targetId: channelId,
    before: beforePayload,
    after: afterPayload,
  });
}
