/**
 * Align ACTIVE student registrations to the canonical term for their section.
 *
 * Canonical term = the (academicYearId, semesterId) pair with the most
 * CourseOffering rows for that section. Ties break on most registrations
 * already on that term, then newest academic year / highest semester sequence.
 *
 * Usage:
 *   node scripts/repair-student-registration-terms.js              # dry-run all
 *   node scripts/repair-student-registration-terms.js --apply
 *   node scripts/repair-student-registration-terms.js --section 21 --apply
 *   node scripts/repair-student-registration-terms.js --student 217 --apply
 */
import { prisma } from '../src/db/prisma.js';
import { ensureSectionOfferings } from '../src/services/academic/ensureSectionOfferings.js';
import { syncDiscussionMembershipsForUser } from '../src/services/discussions/membershipSync.service.js';

function parseArgs(argv) {
  const apply = argv.includes('--apply');
  const sectionId = argv.find((a) => a.startsWith('--section='))?.split('=')[1];
  const batchId = argv.find((a) => a.startsWith('--batch='))?.split('=')[1];
  const studentId = argv.find((a) => a.startsWith('--student='))?.split('=')[1];
  return {
    apply,
    sectionId: sectionId ? Number(sectionId) : null,
    batchId: batchId ? Number(batchId) : null,
    studentId: studentId ? Number(studentId) : null,
  };
}

async function resolveCanonicalTerm(sectionId, registrationsOnSection) {
  const offeringGroups = await prisma.courseOffering.groupBy({
    by: ['academicYearId', 'semesterId'],
    where: { sectionId },
    _count: { _all: true },
  });

  if (offeringGroups.length === 0) {
    return null;
  }

  const regCounts = new Map();
  for (const reg of registrationsOnSection) {
    const key = `${reg.currentAcademicYearId}:${reg.currentSemesterId}`;
    regCounts.set(key, (regCounts.get(key) ?? 0) + 1);
  }

  const ranked = [...offeringGroups].sort((a, b) => {
    const countDiff = b._count._all - a._count._all;
    if (countDiff !== 0) return countDiff;
    const keyA = `${a.academicYearId}:${a.semesterId}`;
    const keyB = `${b.academicYearId}:${b.semesterId}`;
    const regDiff = (regCounts.get(keyB) ?? 0) - (regCounts.get(keyA) ?? 0);
    if (regDiff !== 0) return regDiff;
    const yearDiff = b.academicYearId - a.academicYearId;
    if (yearDiff !== 0) return yearDiff;
    return b.semesterId - a.semesterId;
  });

  const pick = ranked[0];
  const [year, sem] = await Promise.all([
    prisma.academicYear.findUnique({
      where: { id: pick.academicYearId },
      select: { id: true, name: true },
    }),
    prisma.semester.findUnique({
      where: { id: pick.semesterId },
      select: { id: true, name: true, sequence: true },
    }),
  ]);

  if (!year || !sem) return null;

  return {
    academicYearId: year.id,
    academicYearName: year.name,
    semesterId: sem.id,
    semesterName: sem.name,
    offeringCount: pick._count._all,
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const mode = opts.apply ? 'APPLY' : 'DRY-RUN';
  console.log(`repair-student-registration-terms [${mode}]`);

  const where = { status: 'ACTIVE' };
  if (opts.studentId) where.studentId = opts.studentId;
  if (opts.sectionId) where.batchSectionId = opts.sectionId;

  const registrations = await prisma.studentRegistration.findMany({
    where,
    include: {
      student: { select: { id: true, full_name: true, email: true } },
      batchSection: {
        include: {
          batch: {
            include: {
              program: { include: { department: true } },
            },
          },
        },
      },
      currentAcademicYear: { select: { id: true, name: true } },
      currentSemester: { select: { id: true, name: true, sequence: true } },
    },
    orderBy: [{ batchSectionId: 'asc' }, { studentId: 'asc' }],
  });

  const filtered = opts.batchId
    ? registrations.filter((r) => r.batchSection?.batchId === opts.batchId)
    : registrations;

  const bySection = new Map();
  for (const reg of filtered) {
    const list = bySection.get(reg.batchSectionId) ?? [];
    list.push(reg);
    bySection.set(reg.batchSectionId, list);
  }

  const canonicalBySection = new Map();
  for (const [sectionId, regs] of bySection) {
    const canonical = await resolveCanonicalTerm(sectionId, regs);
    if (canonical) canonicalBySection.set(sectionId, canonical);
  }

  let wouldFix = 0;
  let fixed = 0;
  let skipped = 0;
  const sectionsTouched = new Set();

  for (const reg of filtered) {
    const canonical = canonicalBySection.get(reg.batchSectionId);
    if (!canonical) {
      skipped += 1;
      console.warn(
        `skip user=${reg.studentId} section=${reg.batchSection?.name ?? reg.batchSectionId} — no offerings`
      );
      continue;
    }

    const yearOk = reg.currentAcademicYearId === canonical.academicYearId;
    const semOk = reg.currentSemesterId === canonical.semesterId;
    if (yearOk && semOk) continue;

    wouldFix += 1;
    console.log(
      [
        `fix user=${reg.studentId} ${reg.student.full_name}`,
        `  section: ${reg.batchSection.name} (batch ${reg.batchSection.batch.name})`,
        `  was: year=${reg.currentAcademicYear?.name} (${reg.currentAcademicYearId}),`,
        `       sem=${reg.currentSemester?.name} (${reg.currentSemesterId})`,
        `  →:  year=${canonical.academicYearName} (${canonical.academicYearId}),`,
        `       sem=${canonical.semesterName} (${canonical.semesterId})`,
        `       [${canonical.offeringCount} offerings on this term]`,
      ].join('\n')
    );

    if (!opts.apply) continue;

    await prisma.studentRegistration.update({
      where: { id: reg.id },
      data: {
        currentAcademicYearId: canonical.academicYearId,
        currentSemesterId: canonical.semesterId,
      },
    });

    sectionsTouched.add(reg.batchSectionId);
    fixed += 1;

    try {
      await syncDiscussionMembershipsForUser(reg.studentId);
    } catch (err) {
      console.warn(`  membership sync failed user=${reg.studentId}: ${err?.message}`);
    }
  }

  if (opts.apply && sectionsTouched.size > 0) {
    console.log('\nEnsuring section offerings for touched sections…');
    for (const sectionId of sectionsTouched) {
      const sample = filtered.find((r) => r.batchSectionId === sectionId);
      const canonical = canonicalBySection.get(sectionId);
      const batch = sample?.batchSection?.batch;
      if (!batch || !canonical) continue;

      const deptRows = await prisma.department.findMany({
        where: { facultyId: batch.program.department.facultyId },
        select: { id: true },
      });

      const { created } = await ensureSectionOfferings({
        sectionId,
        academicYearId: canonical.academicYearId,
        semesterId: canonical.semesterId,
        curriculumSemester: batch.semester_number,
        departmentIds: deptRows.map((d) => d.id),
        programDepartmentId: batch.program.departmentId,
      });
      console.log(`  section ${sample.batchSection.name}: ensured offerings (+${created} new)`);
    }
  }

  console.log('\nSummary');
  console.log(`  scanned: ${filtered.length}`);
  console.log(`  ${opts.apply ? 'fixed' : 'would fix'}: ${opts.apply ? fixed : wouldFix}`);
  console.log(`  skipped: ${skipped}`);
  if (!opts.apply && wouldFix > 0) {
    console.log('\nRe-run with --apply to write changes.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
