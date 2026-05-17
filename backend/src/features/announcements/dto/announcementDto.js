const IS_NEW_DAYS = Number(process.env.ANNOUNCEMENT_NEW_DAYS) || 7;

/** Canonical "like" stored in `AnnouncementReaction.emoji` (heart). */
export const ANNOUNCEMENT_LIKE_EMOJI = "❤️";

const engagementCountSelect = {
  select: {
    comments: { where: { deletedAt: null } },
    reactions: { where: { emoji: ANNOUNCEMENT_LIKE_EMOJI } },
  },
};

/** @param {string} p */
export function priorityToApi(p) {
  return String(p ?? "NORMAL").toLowerCase();
}

/**
 * @param {{ reads?: { userId: number }[] }} announcement
 * @param {number} userId
 */
export function isAnnouncementNew(announcement, userId) {
  const reads = announcement.reads || [];
  if (reads.some((r) => r.userId === userId)) return false;
  const ageMs = Date.now() - new Date(announcement.createdAt).getTime();
  return ageMs >= 0 && ageMs < IS_NEW_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * @param {import("@prisma/client").Announcement & {
 *   createdBy?: { id?: number; full_name?: string; role?: { name?: string } };
 *   reads?: { userId: number }[];
 *   targets?: import("@prisma/client").AnnouncementTarget[];
 *   _count?: { comments?: number; reactions?: number };
 *   _likedByCurrentUser?: boolean;
 * }} announcement
 * @param {number} currentUserId
 */
export function toAnnouncementDto(announcement, currentUserId) {
  const reads = announcement.reads || [];
  const isRead = reads.some((r) => r.userId === currentUserId);
  const targets = Array.isArray(announcement.targets)
    ? announcement.targets.map((t) => ({ scopeType: t.scopeType, scopeId: t.scopeId }))
    : undefined;

  const likes = announcement._count?.reactions ?? 0;
  const commentsCount = announcement._count?.comments ?? 0;
  const likedByCurrentUser = Boolean(announcement._likedByCurrentUser);

  return {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    bodyMarkdown: announcement.bodyMarkdown ?? undefined,
    bodyHtml: announcement.bodyHtml ?? undefined,
    priority: priorityToApi(announcement.priority),
    targetType: announcement.targetType,
    status: announcement.status,
    expiresAt: announcement.expiresAt ? announcement.expiresAt.toISOString() : null,
    deadlineAt: announcement.deadlineAt ? announcement.deadlineAt.toISOString() : null,
    version: announcement.version,
    slug: announcement.slug ?? undefined,
    acknowledgementRequired: announcement.acknowledgementRequired,
    commentsEnabled: announcement.commentsEnabled,
    targeting: {
      facultyId: announcement.facultyId,
      departmentId: announcement.departmentId,
      batchId: announcement.batchId,
      sectionId: announcement.sectionId,
    },
    targets,
    imageUrls: announcement.imageUrls || [],
    attachments: Array.isArray(announcement.attachments)
      ? announcement.attachments.map((a) => ({
          id: String(a.id),
          fileName: a.url ? a.url.split("/").pop() ?? "" : "",
          fileUrl: a.url,
          fileType: String(a.kind ?? "IMAGE").toLowerCase(),
          thumbnailUrl: a.thumbnailUrl ?? undefined,
          altText: a.altText ?? undefined,
        }))
      : undefined,
    targetRoles: announcement.targetRoles ?? [],
    createdBy: {
      userId: announcement.createdById,
      role: announcement.createdByRole,
      name: announcement.createdBy?.full_name,
    },
    createdAt: announcement.createdAt,
    updatedAt: announcement.updatedAt,
    publishedAt: announcement.publishedAt,
    isPinned: announcement.isPinned,
    isActive: announcement.isActive,
    isRead,
    isNew: !isRead && isAnnouncementNew(announcement, currentUserId),
    likes,
    commentsCount,
    likedByCurrentUser,
  };
}

/**
 * @param {import("@prisma/client").Announcement} announcement
 */
export function buildAnnouncementRealtimePayload(announcement) {
  return {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    bodyHtml: announcement.bodyHtml ?? undefined,
    priority: priorityToApi(announcement.priority),
    targetType: announcement.targetType,
    status: announcement.status,
    expiresAt: announcement.expiresAt ? announcement.expiresAt.toISOString() : null,
    deadlineAt: announcement.deadlineAt ? announcement.deadlineAt.toISOString() : null,
    targeting: {
      facultyId: announcement.facultyId,
      departmentId: announcement.departmentId,
      batchId: announcement.batchId,
      sectionId: announcement.sectionId,
    },
    imageUrls: announcement.imageUrls || [],
    targetRoles: announcement.targetRoles ?? [],
    createdAt: announcement.createdAt,
    updatedAt: announcement.updatedAt,
    publishedAt: announcement.publishedAt,
    isPinned: announcement.isPinned,
    isActive: announcement.isActive,
  };
}

/** @param {import("@prisma/client").Announcement} row */
export function encodeAnnouncementCursor(row) {
  const payload = {
    pin: Boolean(row.isPinned),
    t: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    id: row.id,
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

/**
 * @param {string | undefined} cursor
 * @returns {import("@prisma/client").Prisma.AnnouncementWhereInput | object}
 */
export function buildAnnouncementCursorWhere(cursor) {
  if (!cursor || typeof cursor !== "string") return {};
  let parsed;
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    parsed = JSON.parse(json);
  } catch {
    return {};
  }
  const pin = Boolean(parsed.pin);
  const t = new Date(parsed.t);
  const id = Number(parsed.id);
  if (!Number.isFinite(id) || Number.isNaN(t.getTime())) return {};

  return {
    OR: [
      {
        AND: [
          { isPinned: pin },
          {
            OR: [{ createdAt: { lt: t } }, { AND: [{ createdAt: t }, { id: { lt: id } }] }],
          },
        ],
      },
      ...(pin ? [{ isPinned: false }] : []),
    ],
  };
}

/** Safe preview for audit JSON fields */
export function previewAnnouncementSnapshot(row) {
  if (!row || typeof row !== "object") return row;
  const o = /** @type {Record<string, unknown>} */ (row);
  return {
    title: o.title,
    status: o.status,
    priority: o.priority,
    targetType: o.targetType,
    isPinned: o.isPinned,
    publishedAt: o.publishedAt,
    expiresAt: o.expiresAt,
  };
}

const attachmentSelect = {
  select: {
    id: true,
    url: true,
    kind: true,
    thumbnailUrl: true,
    altText: true,
  },
};

export const announcementDtoPrismaInclude = {
  createdBy: { select: { id: true, full_name: true, role: { select: { name: true } } } },
  targets: { select: { scopeType: true, scopeId: true } },
  attachments: attachmentSelect,
  _count: engagementCountSelect,
};

/** When `AnnouncementTarget` (or related columns) is not migrated yet. */
export const announcementDtoPrismaIncludeLegacy = {
  createdBy: { select: { id: true, full_name: true, role: { select: { name: true } } } },
  _count: engagementCountSelect,
};
