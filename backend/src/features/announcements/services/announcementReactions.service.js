import { prisma } from "../../../db/prisma.js";
import { ANNOUNCEMENT_LIKE_EMOJI } from "../dto/announcementDto.js";

/**
 * Batch-attach `_likedByCurrentUser` for list/detail announcement rows.
 * @param {Array<Record<string, unknown> & { id: number }>} rows
 * @param {number} userId
 * @param {import("@prisma/client").PrismaClient} [db]
 */
export async function attachLikedByCurrentUser(rows, userId, db = prisma) {
  const list = rows ?? [];
  const ids = list.map((a) => Number(a.id)).filter((n) => Number.isFinite(n));
  if (!ids.length) return list.map((a) => ({ ...a, _likedByCurrentUser: false }));
  const likedRows = await db.announcementReaction.findMany({
    where: { announcementId: { in: ids }, userId, emoji: ANNOUNCEMENT_LIKE_EMOJI },
    select: { announcementId: true },
  });
  const likedSet = new Set(likedRows.map((r) => r.announcementId));
  return list.map((a) => ({ ...a, _likedByCurrentUser: likedSet.has(Number(a.id)) }));
}

/**
 * Batch-attach `_acknowledgedByCurrentUser` (only when ack is required).
 * @param {Array<Record<string, unknown> & { id: number }>} rows
 * @param {number} userId
 * @param {import("@prisma/client").PrismaClient} [db]
 */
export async function attachAcknowledgedByCurrentUser(rows, userId, db = prisma) {
  const list = rows ?? [];
  const needIds = list
    .filter((a) => Boolean(a.acknowledgementRequired))
    .map((a) => Number(a.id))
    .filter((n) => Number.isFinite(n));
  if (!needIds.length) {
    return list.map((a) => ({ ...a, _acknowledgedByCurrentUser: false }));
  }
  const ackRows = await db.announcementAcknowledgement.findMany({
    where: { announcementId: { in: needIds }, userId },
    select: { announcementId: true },
  });
  const ackSet = new Set(ackRows.map((r) => r.announcementId));
  return list.map((a) => ({
    ...a,
    _acknowledgedByCurrentUser: Boolean(a.acknowledgementRequired) && ackSet.has(Number(a.id)),
  }));
}
