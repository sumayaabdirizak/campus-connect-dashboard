import { prisma } from "../../db/prisma.js";
import { enrichBatchWithCohortSemester } from "./academicCalendar.js";
import { parseAcademicYearStartYear } from "./academicCalendarDefaults.js";

/**
 * When cohort exceeds faculty/program duration:
 * - Batch → INACTIVE
 * - Students (registrations) → GRADUATED for their final academic year
 */
export async function graduateCompletedCohorts(asOf = new Date()) {
  let batches;
  try {
    batches = await prisma.batch.findMany({
      where: { status: "ACTIVE" },
      include: {
        program: {
          include: {
            department: {
              include: { faculty: { select: { defaultDurationYears: true } } },
            },
          },
        },
        academicYear: true,
        sections: { select: { id: true } },
      },
    });
  } catch (err) {
    if (!String(err?.message ?? "").includes("Unknown argument `status`")) throw err;
    const all = await prisma.batch.findMany({
      include: {
        program: {
          include: {
            department: {
              include: { faculty: { select: { defaultDurationYears: true } } },
            },
          },
        },
        academicYear: true,
        sections: { select: { id: true } },
      },
    });
    let activeIds = new Set();
    try {
      const rows = await prisma.$queryRaw`
        SELECT id FROM "Batch" WHERE "status"::text = 'ACTIVE'
      `;
      activeIds = new Set(rows.map((row) => row.id));
    } catch {
      activeIds = new Set(all.map((b) => b.id));
    }
    batches = all.filter((batch) => activeIds.has(batch.id));
  }

  let batchesGraduated = 0;
  let studentsGraduated = 0;

  for (const batch of batches) {
    const enriched = enrichBatchWithCohortSemester(batch, asOf);
    if (!enriched.isGraduated) continue;

    const durationYears = enriched.durationYears;
    const cohortStart =
      parseAcademicYearStartYear(batch.academicYear?.name) ?? batch.academic_year;
    const graduationStartYear = cohortStart + durationYears - 1;
    const graduationYearName = `${graduationStartYear}/${graduationStartYear + 1}`;

    let graduationYear = await prisma.academicYear.findUnique({
      where: { name: graduationYearName },
    });
    if (!graduationYear) {
      graduationYear = await prisma.academicYear.findFirst({
        orderBy: { end_date: "desc" },
      });
    }

    try {
      await prisma.batch.update({
        where: { id: batch.id },
        data: {
          status: "INACTIVE",
          semester_number: enriched.maxSemesters,
          graduatedAt: asOf,
          graduationAcademicYearId: graduationYear?.id ?? null,
        },
      });
    } catch (err) {
      if (!String(err?.message ?? "").includes("Unknown argument")) throw err;
      await prisma.$executeRaw`
        UPDATE "Batch"
        SET "status" = 'INACTIVE'::"EnrollmentStatus",
            "semester_number" = ${enriched.maxSemesters},
            "graduatedAt" = ${asOf},
            "graduationAcademicYearId" = ${graduationYear?.id ?? null}
        WHERE id = ${batch.id}
      `;
    }
    batchesGraduated += 1;

    const sectionIds = batch.sections.map((section) => section.id);
    if (sectionIds.length === 0) continue;

    try {
      const result = await prisma.studentRegistration.updateMany({
        where: {
          batchSectionId: { in: sectionIds },
          status: "ACTIVE",
        },
        data: {
          status: "GRADUATED",
          graduatedAt: asOf,
          graduationAcademicYearId: graduationYear?.id ?? null,
        },
      });
      studentsGraduated += result.count;
    } catch (err) {
      if (!String(err?.message ?? "").includes("Unknown argument")) throw err;
    }
  }

  return { batchesGraduated, studentsGraduated };
}
