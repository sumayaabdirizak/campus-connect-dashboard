import { isPrismaAnnouncementSchemaDriftError } from "./scope.js";
import { buildVisibleAnnouncementsWhere, buildVisibleAnnouncementsWhereLegacy } from "./buildWhere.js";

/**
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {import("./scope.js").VisibleAnnouncementUser} user
 * @param {Omit<import("@prisma/client").Prisma.AnnouncementFindManyArgs, "where" | "orderBy">} [queryArgs]
 */
export async function getVisibleAnnouncements(prisma, user, queryArgs = {}) {
  const { where: _dropWhere, orderBy: _dropOrder, internalSkipOrder, ...rest } = queryArgs ?? {};
  const where = buildVisibleAnnouncementsWhere(user);
  const orderBy = internalSkipOrder
    ? undefined
    : [{ isPinned: "desc" }, { createdAt: "desc" }, { id: "desc" }];
  try {
    return await prisma.announcement.findMany({ ...rest, where, ...(orderBy ? { orderBy } : {}) });
  } catch (err) {
    if (!isPrismaAnnouncementSchemaDriftError(err)) throw err;
    return prisma.announcement.findMany({
      ...rest,
      where: buildVisibleAnnouncementsWhereLegacy(user),
      ...(orderBy ? { orderBy } : {}),
    });
  }
}

/**
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {import("./scope.js").VisibleAnnouncementUser} user
 */
export async function getUnreadCount(prisma, user) {
  const whereFor = (w) => ({
    where: { AND: [w, { reads: { none: { userId: user.id } } }] },
  });
  const whereForExcludingDrafts = (w) => ({
    where: {
      AND: [w, { status: { not: "DRAFT" } }, { reads: { none: { userId: user.id } } }],
    },
  });
  try {
    return await prisma.announcement.count(whereForExcludingDrafts(buildVisibleAnnouncementsWhere(user)));
  } catch (err) {
    if (!isPrismaAnnouncementSchemaDriftError(err)) throw err;
    try {
      return await prisma.announcement.count(whereFor(buildVisibleAnnouncementsWhereLegacy(user)));
    } catch (legacyErr) {
      if (!isPrismaAnnouncementSchemaDriftError(legacyErr)) throw legacyErr;
      return 0;
    }
  }
}
