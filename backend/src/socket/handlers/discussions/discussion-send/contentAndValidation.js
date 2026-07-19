import { deriveQuestionFields } from "../../../../features/discussions/discussionMessagePublic.js";

/**
 * @param {boolean} e2eeEnabled
 * @param {string} rawContent
 * @param {string} messageTypeUpper
 * @param {object} payload
 * @param {number | null} parentMessageId
 */
export function deriveDiscussionMessageFields(
  e2eeEnabled,
  rawContent,
  messageTypeUpper,
  payload,
  parentMessageId,
) {
  if (e2eeEnabled) {
    const effectiveContent = rawContent.trim();
    const hasText = effectiveContent.length > 0;
    return {
      effectiveContent,
      hasText,
      messageType: messageTypeUpper,
      isAnonymous: false,
    };
  }

  const derived = deriveQuestionFields({
    content: rawContent,
    messageType: messageTypeUpper,
    postAsQuestion: Boolean(payload?.postAsQuestion),
    isAnonymous: Boolean(payload?.isAnonymous),
    parentMessageId,
  });
  const effectiveContent = derived.contentStored.trim();
  const hasText = effectiveContent.length > 0;
  let messageType = derived.messageType;
  let isAnonymous = derived.isAnonymous;
  if (messageType !== "QUESTION") isAnonymous = false;
  return { effectiveContent, hasText, messageType, isAnonymous };
}

/**
 * @param {import("@prisma/client").PrismaClient | import("@prisma/client").Prisma.TransactionClient} db
 * @param {number[]} attachmentIds
 * @param {number} senderId
 * @param {number | null} groupId
 */
export async function validatePendingAttachments(db, attachmentIds, senderId, groupId) {
  if (attachmentIds.length === 0) return { ok: true };
  const pendingAttachments = await db.discussionAttachment.findMany({
    where: {
      id: { in: attachmentIds },
      uploadedById: senderId,
      status: "PENDING",
      messageId: null,
      OR: [{ groupId }, { groupId: null }],
    },
    select: { id: true },
  });
  if (pendingAttachments.length !== attachmentIds.length) {
    return { ok: false, code: "INVALID_ATTACHMENT", message: "Some attachments are invalid or unavailable" };
  }
  return { ok: true };
}

/** @param {boolean} e2eeEnabled */
export function validateE2ePayload(e2eeEnabled, e2e, contextLabel) {
  if (!e2eeEnabled) return { ok: true };
  if (
    !e2e ||
    typeof e2e.ciphertext !== "string" ||
    !e2e.ciphertext ||
    typeof e2e.nonce !== "string" ||
    !e2e.nonce ||
    !Number.isFinite(Number(e2e.keyVersion)) ||
    typeof e2e.senderDeviceId !== "string" ||
    !e2e.senderDeviceId
  ) {
    return {
      ok: false,
      code: "E2E_REQUIRED",
      message: `ciphertext, nonce, keyVersion, senderDeviceId are required for E2E ${contextLabel}`,
    };
  }
  return { ok: true };
}
