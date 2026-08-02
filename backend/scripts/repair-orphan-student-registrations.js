/**
 * Re-enroll ACTIVE students who have a studentProfile but no StudentRegistration,
 * inferring batch/section from student_number (STD-{BATCH}-section-{a|b}-NN).
 */
import { prisma } from '../src/db/prisma.js';
import { syncDiscussionMembershipsForUser } from '../src/features/discussions/membershipSync.service.js';
import { ensureDiscussionGroupForScope } from '../src/features/discussions/groupProvisioning.service.js';
import { DISCUSSION_SCOPE_TYPES } from '../src/features/discussions/policy.js';

const NUM_RE = /^STD-(.+)-section-([a-z0-9]+)-\d+$/i;

async function main() {
  const orphans = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      studentProfile: { isNot: null },
      studentRegistrations: { none: {} },
    },
    select: {
      id: true,
      full_name: true,
      studentProfile: {
        select: {
          student_number: true,
          facultyId: true,
          departmentId: true,
          programId: true,
        },
      },
    },
  });

  console.log(`Orphans (profile, no registration): ${orphans.length}`);

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const user of orphans) {
    const num = user.studentProfile?.student_number || '';
    const m = NUM_RE.exec(num);
    if (!m) {
      skip += 1;
      console.warn(`skip user=${user.id} unparseable number=${num}`);
      continue;
    }
    const batchName = m[1];
    const sectionKey = m[2].toLowerCase();

    try {
      const batch = await prisma.batch.findFirst({
        where: { name: batchName },
        select: {
          id: true,
          name: true,
          programId: true,
          academicYearId: true,
          sections: { select: { id: true, name: true } },
        },
      });
      if (!batch) {
        skip += 1;
        console.warn(`skip user=${user.id} batch missing ${batchName}`);
        continue;
      }

      const section =
        batch.sections.find((s) => s.name.toLowerCase() === `section ${sectionKey}`) ||
        batch.sections.find((s) => s.name.toLowerCase().includes(sectionKey));
      if (!section) {
        skip += 1;
        console.warn(`skip user=${user.id} section missing ${sectionKey} on ${batchName}`);
        continue;
      }

      const semester = await prisma.semester.findFirst({
        where: { academicYearId: batch.academicYearId },
        orderBy: { sequence: 'asc' },
        select: { id: true },
      });
      if (!semester) {
        skip += 1;
        console.warn(`skip user=${user.id} no semester for year ${batch.academicYearId}`);
        continue;
      }

      await prisma.studentRegistration.create({
        data: {
          studentId: user.id,
          batchSectionId: section.id,
          registrationAcademicYearId: batch.academicYearId,
          currentAcademicYearId: batch.academicYearId,
          currentSemesterId: semester.id,
          status: 'ACTIVE',
        },
      });

      await ensureDiscussionGroupForScope({
        scopeType: DISCUSSION_SCOPE_TYPES.BATCH,
        scopeId: batch.id,
        name: batch.name,
        skipDefaultMembers: true,
      });
      await ensureDiscussionGroupForScope({
        scopeType: DISCUSSION_SCOPE_TYPES.SECTION,
        scopeId: section.id,
        name: section.name,
        skipDefaultMembers: true,
      });

      const result = await syncDiscussionMembershipsForUser(user.id);
      ok += 1;
      console.log(`ok user=${user.id} ${user.full_name} → ${batch.name}/${section.name} groups=${result.syncedGroups}`);
    } catch (err) {
      fail += 1;
      console.error(`fail user=${user.id}: ${err?.message}`);
    }
  }

  console.log(JSON.stringify({ ok, skip, fail }, null, 2));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
