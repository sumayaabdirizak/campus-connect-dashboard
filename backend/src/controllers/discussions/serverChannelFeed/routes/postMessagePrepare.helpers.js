import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import { PERMISSION_BITS, hasPermission } from "../../../../features/discussions/permissions.js";
import { deriveQuestionFields } from "../../../../features/discussions/discussionMessagePublic.js";
import { whereFromParam } from "../../../../features/discussions/publicIdResolution.js";

export async function loadChannelForSend(channelId) {
  return prisma.discussionChannel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      publicId: true,
      serverId: true,
      scopeType: true,
      scopeId: true,
      slowModeSeconds: true,
      server: { select: { id: true, publicId: true, e2eeEnabled: true } },
    },
  });
}

export async function loadChannelMembership(serverId, userId) {
  return prisma.discussionGroupMembership.findFirst({
    where: { groupId: serverId, userId, leftAt: null, isActive: true },
  });
}

export function checkMemberMuted(channelMembership) {
  if (!channelMembership?.mutedUntil) return null;
  const until = new Date(channelMembership.mutedUntil);
  if (Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) return null;
  return until;
}

/** Resolves a client-supplied parentMessageId (publicId or legacy int) to
 * the internal integer id. Returns `undefined` when none was supplied (not
 * an error), or `null` when the supplied value doesn't resolve to a root
 * message in this channel. */
export async function resolveParentMessage(channelId, parentMessageId) {
  if (parentMessageId == null) return undefined;
  const where = whereFromParam(parentMessageId);
  if (!where) return null;
  const parent = await prisma.discussionMessage.findFirst({
    where: { ...where, channelId, deletedAt: null, parentMessageId: null },
    select: { id: true },
  });
  return parent?.id ?? null;
}

export function deriveChannelMessageContent(body, parentMessageId) {
  const isEncrypted = !!body.e2e;
  const attachmentIds = body.attachmentIds ?? [];
  let effectiveContent = "";
  let messageType = "TEXT";
  let isAnonymousFlag = false;

  if (isEncrypted) {
    effectiveContent = String(body.content ?? "").trim();
    const hasTextEnc = effectiveContent.length > 0;
    messageType =
      attachmentIds.length > 0 && !hasTextEnc ? "MEDIA" : String(body.messageType || "TEXT").toUpperCase();
  } else {
    const derived = deriveQuestionFields({
      content: body.content ?? "",
      messageType: body.messageType,
      postAsQuestion: body.postAsQuestion,
      isAnonymous: body.isAnonymous,
      parentMessageId,
    });
    effectiveContent = derived.contentStored.trim();
    const hasTextBody = effectiveContent.length > 0;
    messageType = attachmentIds.length > 0 && !hasTextBody ? "MEDIA" : derived.messageType;
    isAnonymousFlag = derived.isAnonymous;
    if (messageType !== "QUESTION") isAnonymousFlag = false;
    if (messageType === "QUESTION" && !hasTextBody) {
      return { error: apiErrorBody("Question text is required", null) };
    }
  }

  const hasText = effectiveContent.length > 0;
  if (!hasText && attachmentIds.length === 0) {
    return { error: apiErrorBody("Either content or attachmentIds is required", null) };
  }

  return { isEncrypted, effectiveContent, messageType, isAnonymousFlag, hasText, attachmentIds };
}

/** Resolves client-supplied attachment identifiers (publicId or legacy int)
 * and validates ownership/status. Returns the resolved internal int ids, or
 * `null` if any identifier is invalid/unowned/already used. */
export async function resolvePendingAttachmentIds(attachmentIdentifiers, userId, serverId) {
  if (attachmentIdentifiers.length === 0) return [];
  const wheres = attachmentIdentifiers.map(whereFromParam).filter(Boolean);
  if (wheres.length !== attachmentIdentifiers.length) return null;
  const pendingRows = await prisma.discussionAttachment.findMany({
    where: {
      AND: [{ OR: wheres }, { OR: [{ groupId: serverId }, { groupId: null }] }],
      uploadedById: userId,
      status: "PENDING",
      messageId: null,
    },
    select: { id: true },
  });
  if (pendingRows.length !== attachmentIdentifiers.length) return null;
  return pendingRows.map((r) => r.id);
}

export async function checkSlowMode({ channel, channelId, userId, channelPermissions }) {
  const slowModeSec = Math.max(0, Math.floor(Number(channel.slowModeSeconds ?? 0)) || 0);
  if (slowModeSec <= 0) return null;
  const canBypassSlow = hasPermission(channelPermissions, PERMISSION_BITS.MANAGE_MESSAGES);
  if (canBypassSlow) return null;

  const lastFromSender = await prisma.discussionMessage.findFirst({
    where: { channelId, senderId: userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (!lastFromSender) return null;

  const elapsedSec = (Date.now() - lastFromSender.createdAt.getTime()) / 1000;
  if (elapsedSec >= slowModeSec) return null;
  const retryAfterSeconds = Math.max(1, Math.ceil(slowModeSec - elapsedSec));
  return {
    status: "error",
    message: `Slow mode is enabled. Try again in ${retryAfterSeconds}s.`,
    code: "SLOW_MODE",
    retryAfterSeconds,
  };
}
