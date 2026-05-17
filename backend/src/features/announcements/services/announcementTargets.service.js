/**
 * Dual-write: derive `AnnouncementTarget` rows from flat FKs + explicit multi-targets.
 * @param {import("@prisma/client").Announcement} row
 * @param {{ scopeType: string; scopeId: number }[]} [extraTargets]
 */
export function mergeAnnouncementTargetRows(row, extraTargets = []) {
  const map = new Map();
  const add = (scopeType, scopeId) => {
    if (!scopeType || !Number.isFinite(Number(scopeId))) return;
    const key = `${scopeType}:${scopeId}`;
    map.set(key, { scopeType, scopeId: Number(scopeId) });
  };
  for (const t of extraTargets) {
    add(t.scopeType, t.scopeId);
  }
  if (row.facultyId != null) add("FACULTY", row.facultyId);
  if (row.departmentId != null) add("DEPARTMENT", row.departmentId);
  if (row.batchId != null) add("BATCH", row.batchId);
  if (row.sectionId != null) add("SECTION", row.sectionId);
  return Array.from(map.values());
}

/**
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 * @param {number} announcementId
 * @param {{ scopeType: string; scopeId: number }[]} rows
 */
export async function replaceAnnouncementTargets(tx, announcementId, rows) {
  await tx.announcementTarget.deleteMany({ where: { announcementId } });
  if (!rows.length) return;
  await tx.announcementTarget.createMany({
    data: rows.map((r) => ({
      announcementId,
      scopeType: /** @type {import("@prisma/client").AnnouncementTargetScopeType} */ (r.scopeType),
      scopeId: r.scopeId,
    })),
  });
}
