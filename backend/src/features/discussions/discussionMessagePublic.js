/** Public JSON shaping for discussion messages (anonymous Q&A, etc.). */

/** Heuristic Q&A channel detection for “mark as answer” and UI. */
export function isDiscussionQaChannelNameKey(groupKey, name) {
  const hay = `${String(groupKey || "")} ${String(name || "")}`.toLowerCase();
  return /(?:^|[-_\s])(qa|q&a|q\s*\/\s*a|questions?|help-?desk)(?:$|[-_\s])/i.test(hay);
}

/** True when the payload starts with `/qa` (after optional whitespace). */
export function hasQaSlashPrefix(content) {
  return typeof content === "string" && /^\s*\/qa\b/i.test(content);
}

/** Strips a leading `/qa` token from message body (slash command). */
export function stripQaSlashPrefix(content) {
  if (typeof content !== "string") return "";
  return content.replace(/^\s*\/qa\b\s*/i, "");
}

/**
 * Derives stored text, messageType, and isAnonymous for a new message.
 * Root-only questions; anonymous only on root posts.
 */
export function deriveQuestionFields({
  content,
  messageType: messageTypeIn,
  postAsQuestion,
  isAnonymous: isAnonymousIn,
  parentMessageId,
}) {
  const raw = typeof content === "string" ? content : "";
  const triggeredBySlash = hasQaSlashPrefix(raw);
  const textAfterSlash = (triggeredBySlash ? stripQaSlashPrefix(raw) : raw).trimEnd();
  const parentId =
    parentMessageId != null && Number.isFinite(Number(parentMessageId))
      ? Number(parentMessageId)
      : null;

  let messageType = String(messageTypeIn || "TEXT").toUpperCase();
  if (parentId == null && (postAsQuestion || triggeredBySlash)) {
    messageType = "QUESTION";
  }
  const isAnonymous =
    Boolean(isAnonymousIn) && parentId == null && messageType === "QUESTION";

  return {
    contentStored: textAfterSlash,
    messageType,
    isAnonymous,
    triggeredBySlash,
  };
}

function canRevealAnonymousSender(membership) {
  if (!membership) return false;
  const role = String(membership.role || "").toUpperCase();
  return (
    Boolean(membership.canModerate) ||
    ["TA", "ADVISOR", "HEAD", "LECTURER", "ADMIN", "DEAN"].includes(role)
  );
}

/**
 * Masks anonymous senders for API consumers.
 * @param {object} message — row with sender, senderId, isAnonymous
 * @param {number|null} viewerUserId
 * @param {object|null} membership — discussion group membership row shape
 * @param {{ broadcast?: boolean }} options — broadcast WS fanout: always mask
 */
export function applyAnonymousSenderPolicy(message, viewerUserId, membership, options = {}) {
  const broadcast = options.broadcast === true;
  const anon = Boolean(message?.isAnonymous);
  if (!anon) {
    return {
      ...message,
      isAnonymous: false,
      senderResolved: null,
    };
  }

  const uid = Number(viewerUserId);
  const authorId = message.senderId != null ? Number(message.senderId) : null;
  const isAuthor =
    !broadcast &&
    authorId != null &&
    Number.isFinite(uid) &&
    authorId === uid &&
    uid > 0;

  const canReveal = !broadcast && canRevealAnonymousSender(membership);

  if (isAuthor || canReveal) {
    const resolved =
      canReveal && !isAuthor && authorId != null && message.sender
        ? { id: authorId, full_name: message.sender.full_name }
        : null;
    return {
      ...message,
      isAnonymous: true,
      senderResolved: resolved,
      sender: message.sender,
      senderId: message.senderId,
    };
  }

  return {
    ...message,
    isAnonymous: true,
    senderResolved: null,
    senderId: null,
    sender: { id: null, full_name: "Anonymous" },
  };
}

/** Notification / toast label: never leak real names for anonymous outward notifications. */
export function anonymousSafeSenderName(message) {
  return message?.isAnonymous ? "Anonymous" : message?.sender?.full_name ?? null;
}
