/**
 * University-wide active users by role (AO groups, Office Staff 1:1 DMs).
 * @param {number} excludeUserId
 * @param {string} q
 * @param {readonly string[]} roleNames
 * @param {import('@prisma/client').PrismaClient} prismaClient
 * @param {object} userSelect
 */
export async function listUniversityRoleCandidates(
  excludeUserId,
  q,
  roleNames,
  prismaClient,
  userSelect
) {
  const needle = String(q ?? '')
    .trim()
    .slice(0, 80);
  const roles = [...roleNames].map((r) => String(r).toUpperCase());
  if (roles.length === 0) return [];

  return prismaClient.user.findMany({
    where: {
      id: { not: Number(excludeUserId) },
      status: 'ACTIVE',
      role: { name: { in: roles } },
      ...(needle
        ? {
            OR: [
              { full_name: { contains: needle, mode: 'insensitive' } },
              { email: { contains: needle, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: userSelect,
    take: 250,
    orderBy: { full_name: 'asc' },
  });
}
