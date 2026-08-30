/**
 * Side-by-side enrollment + course-offering comparison for two students.
 * Helps debug "same section but different my-courses" reports.
 *
 * Usage:
 *   node scripts/compare-student-enrollments.js
 *   node scripts/compare-student-enrollments.js 216 217
 */
import { prisma } from '../src/db/prisma.js';

const studentIds = process.argv.slice(2).map(Number).filter((n) => n > 0);
const ids = studentIds.length >= 2 ? studentIds.slice(0, 2) : [216, 217];

const regInclude = {
  batchSection: {
    include: {
      batch: {
        include: {
          program: { include: { department: { select: { id: true, name: true } } } },
        },
      },
    },
  },
  currentAcademicYear: { select: { id: true, name: true } },
  currentSemester: { select: { id: true, name: true, sequence: true } },
  registrationAcademicYear: { select: { id: true, name: true } },
};

async function loadStudent(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      full_name: true,
      email: true,
      status: true,
      studentProfile: { select: { student_number: true } },
      studentRegistrations: {
        orderBy: { created_at: 'desc' },
        include: regInclude,
      },
    },
  });
  return user;
}

function fmtReg(reg, label) {
  if (!reg) return `${label}: (none)`;
  const batch = reg.batchSection?.batch;
  return [
    `${label} id=${reg.id} status=${reg.status} created=${reg.created_at.toISOString()}`,
    `  section: ${reg.batchSection?.name} (batchSectionId=${reg.batchSectionId})`,
    `  batch: ${batch?.name ?? '?'} (batchId=${batch?.id ?? '?'})`,
    `  program/dept: ${batch?.program?.name ?? '?'} / ${batch?.program?.department?.name ?? '?'}`,
    `  current year: ${reg.currentAcademicYear?.name} (id=${reg.currentAcademicYearId})`,
    `  current semester: ${reg.currentSemester?.name} seq=${reg.currentSemester?.sequence} (id=${reg.currentSemesterId})`,
  ].join('\n');
}

async function offeringsForReg(reg) {
  if (!reg) return [];
  return prisma.courseOffering.findMany({
    where: {
      sectionId: reg.batchSectionId,
      semesterId: reg.currentSemesterId,
      academicYearId: reg.currentAcademicYearId,
    },
    include: {
      course: { select: { code: true, name: true } },
      semester: { select: { name: true } },
    },
    orderBy: { course: { code: 'asc' } },
  });
}

function offeringKey(o) {
  return `${o.course.code} — ${o.course.name}`;
}

async function main() {
  console.log(`Comparing students: ${ids.join(' vs ')}\n`);

  const users = await Promise.all(ids.map(loadStudent));

  for (let i = 0; i < users.length; i += 1) {
    const user = users[i];
    const label = `Student ${i + 1} (id=${ids[i]})`;
    console.log('='.repeat(60));
    if (!user) {
      console.log(`${label}: NOT FOUND\n`);
      continue;
    }
    console.log(`${label}: ${user.full_name}`);
    console.log(`  email: ${user.email}`);
    console.log(`  number: ${user.studentProfile?.student_number ?? '—'}`);
    console.log(`  user status: ${user.status}`);
    console.log(`  registration rows: ${user.studentRegistrations.length}`);
    console.log('');

    user.studentRegistrations.forEach((reg, idx) => {
      console.log(fmtReg(reg, idx === 0 ? 'ACTIVE (newest)' : `older #${idx + 1}`));
      console.log('');
    });
  }

  const newest = users.map((u) => u?.studentRegistrations[0] ?? null);
  const offerings = await Promise.all(newest.map(offeringsForReg));

  console.log('='.repeat(60));
  console.log('COURSES (from newest registration — same query as /my-courses)\n');

  for (let i = 0; i < ids.length; i += 1) {
    const user = users[i];
    const list = offerings[i];
    console.log(`${user?.full_name ?? ids[i]}: ${list.length} offering(s)`);
    for (const o of list) {
      console.log(`  • ${offeringKey(o)} [offeringId=${o.id}, publicId=${o.publicId}]`);
    }
    console.log('');
  }

  const r0 = newest[0];
  const r1 = newest[1];
  console.log('='.repeat(60));
  console.log('DIFF SUMMARY\n');

  if (!users[0] || !users[1]) {
    console.log('Cannot diff — one or both users missing.');
    return;
  }

  if (!r0 || !r1) {
    console.log('Cannot diff offerings — missing registration on one side.');
    if (!r0) console.log(`  Student ${ids[0]} has no StudentRegistration`);
    if (!r1) console.log(`  Student ${ids[1]} has no StudentRegistration`);
    console.log('\nFix: node scripts/repair-orphan-student-registrations.js');
    return;
  }

  const regFields = [
    ['batchSectionId', r0.batchSectionId, r1.batchSectionId],
    ['currentSemesterId', r0.currentSemesterId, r1.currentSemesterId],
    ['currentAcademicYearId', r0.currentAcademicYearId, r1.currentAcademicYearId],
    ['status', r0.status, r1.status],
  ];

  let regMatch = true;
  for (const [name, a, b] of regFields) {
    const ok = a === b;
    if (!ok) regMatch = false;
    console.log(`  ${name}: ${a} vs ${b} ${ok ? '✓' : '✗ MISMATCH'}`);
  }

  const set0 = new Set(offerings[0].map((o) => o.course.code));
  const set1 = new Set(offerings[1].map((o) => o.course.code));
  const only0 = [...set0].filter((c) => !set1.has(c));
  const only1 = [...set1].filter((c) => !set0.has(c));

  if (only0.length) console.log(`\n  Only ${users[0].full_name}: ${only0.join(', ')}`);
  if (only1.length) console.log(`\n  Only ${users[1].full_name}: ${only1.join(', ')}`);
  if (!only0.length && !only1.length && offerings[0].length === offerings[1].length) {
    console.log('\n  Course codes match for both students.');
  }

  if (regMatch && !only0.length && !only1.length) {
    console.log('\nEnrollment and course list align — if UI still differs, check in-course filters (draft/schedule).');
  } else if (regMatch && (only0.length || only1.length)) {
    console.log('\nSame registration scope but different offerings — check CourseOffering rows or run my-courses (ensureSectionOfferings).');
  } else {
    console.log('\nRegistration mismatch — align batchSectionId / semester / year, or remove duplicate wrong registrations.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
