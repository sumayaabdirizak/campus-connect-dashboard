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
