import { prisma } from '../src/db/prisma.js';
import { whereUsersInFaculty } from '../src/utils/scopeWhere.js';

const facultyId = 1;
const where = whereUsersInFaculty(facultyId);
const total = await prisma.user.count({ where });
const students = await prisma.user.count({
  where: { ...where, role: { name: 'STUDENT' } },
});
const withProfile = await prisma.studentProfile.count({ where: { facultyId } });
const allStudents = await prisma.user.count({ where: { role: { name: 'STUDENT' } } });
const profileFaculty1 = await prisma.studentProfile.count({ where: { facultyId: 1 } });

console.log(
  JSON.stringify({
    inFacultyWhereTotal: total,
    inFacultyStudents: students,
    studentProfilesFaculty1: profileFaculty1,
    allStudents,
    withProfile,
  })
);

await prisma.$disconnect();
