import { prisma } from "../../../../db/prisma.js";
import {
  computeChannelPermissions,
  hasPermission,
  PERMISSION_BITS,
} from "../../../../features/discussions/permissions.js";
import {
  deriveDiscussionMessageFields,
  validatePendingAttachments,
  validateE2ePayload,
} from "../discussion-send/contentAndValidation.js";

/** @param {object} args */
export async function validateChannelMessagePreconditions(args) {
  const { socket, ack, channelId, socketUser, ackOrEmitError, attachmentIds, e2e, payload } = args;

  const parentMessageIdRaw = Number(payload?.parentMessageId);
  const parentMessageId =
    Number.isInteger(parentMessageIdRaw) && parentMessageIdRaw > 0 ? parentMessageIdRaw : null;
  const rawContent = typeof payload?.content === "string" ? payload.content : "";

  const channel = await prisma.discussionChannel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      serverId: true,
      scopeType: true,
      scopeId: true,
      server: { select: { id: true, e2eeEnabled: true } },
    },
  });
  if (!channel) return { ok: false, ack: () => ackOrEmitError(socket, ack, "NOT_FOUND", "Channel not found") };

  const perms = await computeChannelPermissions({ userId: socketUser.id, channelId });
  if (!hasPermission(perms, PERMISSION_BITS.SEND_MESSAGES)) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, "FORBIDDEN", "Cannot send in this channel") };
  }

  const e2eeEnabled = channel.server?.e2eeEnabled !== false;
  const e2eCheck = validateE2ePayload(e2eeEnabled, e2e, "channels");
  if (!e2eCheck.ok) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, e2eCheck.code, e2eCheck.message) };
  }

  const attachCheck = await validatePendingAttachments(
    prisma,
    attachmentIds,
    Number(socketUser.id),
    channel.serverId,
  );
  if (!attachCheck.ok) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, attachCheck.code, attachCheck.message) };
  }

  if (parentMessageId != null) {
    const parent = await prisma.discussionMessage.findFirst({
      where: { id: parentMessageId, channelId, deletedAt: null, parentMessageId: null },
      select: { id: true },
    });
    if (!parent) {
      return {
        ok: false,
        ack: () =>
          ackOrEmitError(socket, ack, "INVALID_PARENT", "parentMessageId must be a root message in this channel"),
      };
    }
  }

  const fields = deriveDiscussionMessageFields(
    e2eeEnabled,
    rawContent,
    args.messageTypeUpper,
    payload,
    parentMessageId,
  );
  const createdMessageType =
    attachmentIds.length > 0 && !fields.hasText ? "MEDIA" : fields.messageType;
  if (createdMessageType === "QUESTION" && !fields.hasText) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, "INVALID_MESSAGE", "Question text is required") };
  }
  if (!fields.hasText && attachmentIds.length === 0) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, "INVALID_MESSAGE", "content or attachmentIds required") };
  }

  return { ok: true, channel, parentMessageId, e2eeEnabled, fields, createdMessageType };
}
