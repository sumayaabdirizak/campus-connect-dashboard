/**
 * Backfill TeacherAssigning from CourseOffering.teacherId and AIS lecturer sync gaps.
 * The dean Courses table counts teacherAssignings, not offering.teacherId alone.
 */
import { prisma } from '../src/db/prisma.js';
import { syncFacultyLecturersFromAis } from '../src/services/integrations/academicInfoSystem/syncLecturers.js';

const fromOfferings = await prisma.courseOffering.groupBy({
  by: ['courseId', 'teacherId'],
  where: { teacherId: { not: null } },
});

let createdFromOfferings = 0;
let alreadyFromOfferings = 0;

for (const row of fromOfferings) {
  const teacherId = row.teacherId;
  const courseId = row.courseId;
  if (!teacherId || !courseId) continue;

  const existing = await prisma.teacherAssigning.findUnique({
    where: { teacherId_courseId: { teacherId, courseId } },
    select: { id: true },
  });
  if (existing) {
    alreadyFromOfferings += 1;
    continue;
  }
  await prisma.teacherAssigning.create({ data: { teacherId, courseId } });
  createdFromOfferings += 1;
}

console.log('From offerings:', { createdFromOfferings, alreadyFromOfferings });

const ais = await syncFacultyLecturersFromAis({
  facultyId: 12,
  facultyCode: 'EMS',
  facultyName: 'Economics and Management Science',
  assignOfferings: true,
  dryRun: false,
});

console.log(
  JSON.stringify(
    {
      teacherAssigningsCreated: ais.teacherAssigningsCreated,
      teacherAssigningsAlready: ais.teacherAssigningsAlready,
      offeringsAssigned: ais.offeringsAssigned,
      updated: ais.updated,
    },
    null,
    2
  )
);

const counts = {
  teacherAssignings: await prisma.teacherAssigning.count(),
  offeringsWithTeacher: await prisma.courseOffering.count({
    where: { teacherId: { not: null } },
  }),
};

console.log('Totals:', counts);

await prisma.$disconnect();
