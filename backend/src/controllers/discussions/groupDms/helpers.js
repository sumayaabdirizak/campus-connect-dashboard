import { prisma } from '../../../db/prisma.js';
import { whereFromParam } from '../../../services/discussions/publicIdResolution.js';

export const MIN_TOTAL_MEMBERS = 3;
/** Total members including creator (was 10). */
export const MAX_TOTAL_MEMBERS = 50;

/**
 * @param {unknown} identifier Route param — GroupDm UUID publicId or legacy numeric id.
 * @param {number} userId
 */
export async function getActiveMember(identifier, userId) {
  const groupDmWhere = whereFromParam(identifier);
  if (!groupDmWhere) return null;
  return prisma.groupDmMember.findFirst({
    where: { groupDm: groupDmWhere, userId, leftAt: null },
    include: { groupDm: { select: { id: true, publicId: true, archivedAt: true } } },
  });
}

/**
 * Resolves a client-supplied identifier (UUID publicId or legacy numeric id)
 * to `{ id, publicId }` — used at every socket-handler entry point so the
 * rest of that handler (Prisma queries, internal room naming in rooms.js)
 * keeps using the integer id unchanged, while responses/broadcasts back to
 * clients use `publicId`. Returns null if not found.
 * @param {unknown} identifier
 */
export async function resolveGroupDmRow(identifier) {
  const where = whereFromParam(identifier);
  if (!where) return null;
  return prisma.groupDm.findUnique({ where, select: { id: true, publicId: true, archivedAt: true } });
}

/** Wire-format a fetched GroupDm row — `id` becomes the UUID `publicId`. */
export function toGroupDmDto(row) {
  if (!row) return row;
  const { id: _internalId, ...rest } = row;
  return { ...rest, id: row.publicId };
}
