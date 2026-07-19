/** @param {object} parsed @returns {{ scopeType: string; scopeId: number }[]} */
export function parseExtraTargetsFromParsed(parsed) {
  return Array.isArray(parsed.targets)
    ? parsed.targets
        .map((t) => ({
          scopeType: String(t?.scopeType ?? "").toUpperCase(),
          scopeId: Number(t?.scopeId),
        }))
        .filter(
          (t) =>
            ["FACULTY", "DEPARTMENT", "BATCH", "SECTION"].includes(t.scopeType) &&
            Number.isFinite(t.scopeId),
        )
    : [];
}

/**
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {string} role
 * @param {number} userId
 * @param {object} parsed
 */
export async function resolveCreatorFacultyScope(prisma, role, userId, parsed) {
  if (role === "DEAN") {
    const dean = await prisma.deanProfile.findUnique({
      where: { userId },
      select: { facultyId: true },
    });
    if (!dean) {
      return { ok: false, status: 403, message: "Dean profile not found" };
    }
    return {
      ok: true,
      facultyIdForTargeting: dean.facultyId,
      facultyScope: dean.facultyId,
    };
  }
  return {
    ok: true,
    facultyIdForTargeting: parsed.facultyId ?? null,
    facultyScope: undefined,
  };
}
