/**
 * Announcements: only the creator may edit / delete / pin / view publisher analytics.
 * @param {number} actorUserId
 * @param {{ createdById?: number | null }} announcement
 */
export function isAnnouncementAuthor(actorUserId, announcement) {
  const actor = Number(actorUserId);
  const owner = Number(announcement?.createdById);
  return Number.isFinite(actor) && actor > 0 && Number.isFinite(owner) && actor === owner;
}

/**
 * @returns {{ ok: true } | { ok: false, status: number, message: string }}
 */
export function assertAnnouncementAuthor(actorUserId, announcement) {
  if (isAnnouncementAuthor(actorUserId, announcement)) return { ok: true };
  return {
    ok: false,
    status: 403,
    message: 'You can only manage announcements you created',
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prismaClient
 * @param {number} actorUserId
 * @param {number} announcementId
 */
export async function assertCanManageAnnouncementById(
  prismaClient,
  actorUserId,
  announcementId
) {
  const row = await prismaClient.announcement.findUnique({
    where: { id: Number(announcementId) },
    select: { createdById: true },
  });
  if (!row) {
    return { ok: false, status: 404, message: 'Announcement not found' };
  }
  return assertAnnouncementAuthor(actorUserId, row);
}
