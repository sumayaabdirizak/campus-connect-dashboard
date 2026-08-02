import { prisma } from "../../db/prisma.js";

/** Next global semester number (1, 2, 3 … never resets per year). */
export async function getNextSemesterSequence(count = 1) {
  const latest = await prisma.semester.findFirst({
    orderBy: { sequence: "desc" },
    select: { sequence: true },
  });
  const start = (latest?.sequence ?? 0) + 1;
  return Array.from({ length: count }, (_, index) => start + index);
}

async function hasDuplicateSequences() {
  const grouped = await prisma.semester.groupBy({
    by: ["sequence"],
    _count: { sequence: true },
  });
  return grouped.some((row) => row._count.sequence > 1);
}

/**
 * Re-number all semesters chronologically to a continuous 1..N sequence.
 * Only runs when duplicate sequence values exist (legacy per-year 1/2).
 */
export async function renumberSemestersGloballyIfNeeded() {
  if (!(await hasDuplicateSequences())) return { total: 0, renumbered: false };

  const rows = await prisma.semester.findMany({
    include: { academicYear: { select: { start_date: true } } },
    orderBy: [{ academicYear: { start_date: "asc" } }, { start_date: "asc" }, { id: "asc" }],
  });

  let sequence = 1;
  for (const row of rows) {
    if (row.sequence !== sequence) {
      await prisma.semester.update({
        where: { id: row.id },
        data: { sequence },
      });
    }
    sequence += 1;
  }
  return { total: rows.length, renumbered: true };
}

export async function renumberSemestersGlobally() {
  return renumberSemestersGloballyIfNeeded();
}
