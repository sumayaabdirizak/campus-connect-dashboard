import {
  buildVisibleAnnouncementsWhere,
  buildVisibleAnnouncementsWhereLegacy,
  isPrismaAnnouncementSchemaDriftError,
} from "./announcementVisibility.service.js";

/**
 * Max IDs returned from the GIN-backed `plainto_tsquery` probe (bounds query cost).
 * Override with `ANNOUNCEMENT_SEARCH_FULLTEXT_MAX_IDS`.
 */
export function getAnnouncementSearchFulltextMaxIds() {
  const n = Number(process.env.ANNOUNCEMENT_SEARCH_FULLTEXT_MAX_IDS ?? 500);
  if (!Number.isFinite(n)) return 500;
  return Math.min(5000, Math.max(50, Math.trunc(n)));
}

/**
 * `plainto_tsquery('english', q)` against `searchVector` (parameterized; no string concat).
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {string} q trimmed search string (≥2 chars recommended)
 * @param {{ limit?: number }} [opts]
 * @returns {Promise<number[]>}
 */
export async function fullTextAnnouncementIds(prisma, q, opts = {}) {
  const limit = opts.limit ?? getAnnouncementSearchFulltextMaxIds();
  const lim = Math.min(5000, Math.max(1, Math.trunc(limit)));
  const rows = await prisma.$queryRaw`
    SELECT id FROM "Announcement"
    WHERE "searchVector" @@ plainto_tsquery('english', ${q})
    LIMIT ${lim}
  `;
  /** @type {{ id: number }[]} */
  const list = Array.isArray(rows) ? rows : [];
  return list.map((r) => Number(r.id)).filter((n) => Number.isFinite(n));
}

/**
 * Substring match on title and body text (Prisma → PostgreSQL `ILIKE` with `contains` + `insensitive`).
 *
 * @param {string} needle
 * @returns {import("@prisma/client").Prisma.AnnouncementWhereInput}
 */
export function announcementIlikeTitleContentWhere(needle) {
  return {
    OR: [
      { title: { contains: needle, mode: "insensitive" } },
      { content: { contains: needle, mode: "insensitive" } },
    ],
  };
}

/**
 * Prefer GIN `searchVector` id list; on missing column / drift fall back to ILIKE title+content only.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {string | null | undefined} q
 * @param {{ limit?: number }} [opts]
 * @returns {Promise<{ ids: number[] | null, legacy: boolean }>}
 *   `ids` null when `q` empty/short (no text filter). `legacy: true` → use {@link announcementIlikeTitleContentWhere}.
 */
export async function resolveAnnouncementTextSearch(prisma, q, opts = {}) {
  const trimmed = q != null ? String(q).trim() : "";
  if (!trimmed || trimmed.length < 2) return { ids: null, legacy: false };
  try {
    const ids = await fullTextAnnouncementIds(prisma, trimmed, { limit: opts.limit });
    return { ids, legacy: false };
  } catch (err) {
    if (isPrismaAnnouncementSchemaDriftError(err)) return { ids: null, legacy: true };
    throw err;
  }
}

/**
 * Run a visibility-scoped announcement text search (full-text ids ∩ visibility, or ILIKE fallback).
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {{
 *   visibilityUser: object,
 *   q: string,
 *   take: number,
 *   modernInclude: import("@prisma/client").Prisma.AnnouncementInclude,
 *   legacyInclude: import("@prisma/client").Prisma.AnnouncementInclude,
 *   fullTextIdLimit?: number,
 * }} args
 */
export async function findVisibleAnnouncementsBySearch(prisma, args) {
  const { visibilityUser, q, take, modernInclude, legacyInclude, fullTextIdLimit } = args;
  const trimmed = String(q ?? "").trim();
  if (trimmed.length < 2) return [];

  const { ids, legacy } = await resolveAnnouncementTextSearch(prisma, trimmed, {
    limit: fullTextIdLimit,
  });

  /** @type {import("@prisma/client").Prisma.AnnouncementWhereInput} */
  const textWhere = legacy
    ? announcementIlikeTitleContentWhere(trimmed)
    : { id: { in: ids && ids.length ? ids : [] } };

  const baseModern = buildVisibleAnnouncementsWhere(visibilityUser);
  const whereModern = { AND: [baseModern, textWhere] };

  try {
    return await prisma.announcement.findMany({
      where: whereModern,
      take,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: modernInclude,
    });
  } catch (err) {
    if (!isPrismaAnnouncementSchemaDriftError(err)) throw err;
    const baseLegacy = buildVisibleAnnouncementsWhereLegacy(visibilityUser);
    return prisma.announcement.findMany({
      where: { AND: [baseLegacy, textWhere] },
      take,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: legacyInclude,
    });
  }
}
