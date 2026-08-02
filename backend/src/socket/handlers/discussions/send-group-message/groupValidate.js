import { prisma } from "../../../../db/prisma.js";
import {
  deriveDiscussionMessageFields,
  validatePendingAttachments,
  validateE2ePayload,
} from "../discussion-send/contentAndValidation.js";
import { resolveServerRow } from "../../../../controllers/discussions/serverShared.js";
import { whereFromParam } from "../../../../features/discussions/publicIdResolution.js";

/** @param {object} args */
export async function validateGroupMessagePreconditions(args) {
  const { socket, payload, ack, socketUser, ackOrEmitError, attachmentIds, e2e, getDiscussionMembership } = args;

  const groupRow = await resolveServerRow(payload?.groupId);
  if (!groupRow) {
    return {
      ok: false,
      ack: () =>
        ackOrEmitError(socket, ack, "INVALID_GROUP", "groupId or channelId or groupDmId is required"),
    };
  }
  const groupId = groupRow.id;

  const membership = await getDiscussionMembership(groupId, socketUser.id);
  if (!membership) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, "FORBIDDEN", "User is not a member of this group") };
  }
  if (!membership.canPost) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, "FORBIDDEN", "Posting is disabled for this user") };
  }

  let parentMessageId = null;
  if (payload?.parentMessageId != null) {
    const parentWhere = whereFromParam(payload.parentMessageId);
    const parent = parentWhere
      ? await prisma.discussionMessage.findFirst({
          where: { ...parentWhere, groupId, deletedAt: null },
          select: { id: true },
        })
      : null;
    if (!parent) {
      return { ok: false, ack: () => ackOrEmitError(socket, ack, "INVALID_PARENT", "parentMessageId not found in this group") };
    }
    parentMessageId = parent.id;
  }

  const e2eeEnabled = membership.group?.e2eeEnabled !== false;
  const e2eCheck = validateE2ePayload(e2eeEnabled, e2e, "groups");
  if (!e2eCheck.ok) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, e2eCheck.code, e2eCheck.message) };
  }

  const attachCheck = await validatePendingAttachments(prisma, attachmentIds, Number(socketUser.id), groupId);
  if (!attachCheck.ok) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, attachCheck.code, attachCheck.message) };
  }

  const rawContent = typeof payload?.content === "string" ? payload.content : "";
  const fields = deriveDiscussionMessageFields(
    e2eeEnabled,
    rawContent,
    args.messageTypeUpper,
    payload,
    parentMessageId,
  );
  const messageType = attachmentIds.length > 0 && !fields.hasText ? "MEDIA" : fields.messageType;
  if (!fields.hasText && attachmentIds.length === 0) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, "INVALID_MESSAGE", "content or attachmentIds required") };
  }
  if (messageType === "QUESTION" && !fields.hasText) {
    return { ok: false, ack: () => ackOrEmitError(socket, ack, "INVALID_MESSAGE", "Question text is required") };
  }

  return { ok: true, groupId, groupPublicId: groupRow.publicId, membership, parentMessageId, e2eeEnabled, fields, messageType };
}
