/**
 * Recompute batch cohort academic year + curriculum semester from admission year.
 *
 * Usage:
 *   node scripts/repair-batch-cohorts.js              # dry-run
 *   node scripts/repair-batch-cohorts.js --apply
 */
import { prisma } from '../src/db/prisma.js';
import {
  inferAdmissionYearFromBatchCode,
  applyBatchCohortFromAdmission,
} from '../src/services/integrations/academicInfoSystem/resolveAisSyncScope.js';

const apply = process.argv.includes('--apply');

const batches = await prisma.batch.findMany({
  include: {
    program: { select: { durationYears: true } },
    academicYear: { select: { id: true, name: true } },
    sections: {
      select: {
        studentRegistrations: {
          select: {
            student: {
              select: {
                studentProfile: { select: { admission_year: true } },
              },
            },
          },
        },
      },
    },
  },
  orderBy: { name: 'asc' },
});

let wouldUpdate = 0;
let updated = 0;

for (const batch of batches) {
  const profileYears = [];
  for (const section of batch.sections) {
    for (const reg of section.studentRegistrations) {
      const y = reg.student?.studentProfile?.admission_year;
      if (Number.isFinite(y) && y > 1980) profileYears.push(y);
    }
  }

  const admissionYear =
    profileYears.length > 0
      ? Math.min(...profileYears)
      : (Number.isFinite(batch.academic_year) && batch.academic_year > 1980
          ? batch.academic_year
          : inferAdmissionYearFromBatchCode(batch.name));

  if (!admissionYear) {
    console.log(`skip ${batch.name}: no admission year`);
    continue;
  }

  const duration = batch.program?.durationYears ?? 4;
  if (!apply) {
    wouldUpdate += 1;
    console.log(
      `would update ${batch.name}: admission ${admissionYear} (was ay=${batch.academicYear?.name}, sem=${batch.semester_number})`
    );
    continue;
  }

  const cohort = await applyBatchCohortFromAdmission(batch.id, admissionYear, duration);
  if (cohort) {
    updated += 1;
    console.log(
      `updated ${batch.name}: ay=${cohort.cohortAyLabel}, cohortSemester=${cohort.cohortSemester}`
    );
  }
}

console.log(
  JSON.stringify({ apply, scanned: batches.length, wouldUpdate, updated }, null, 2)
);

await prisma.$disconnect();
