/**
 * Full university AIS sync for EMS faculty (12):
 * academic terms → dean user → students → batch cohort repair → courses → lecturers → registration terms.
 */
import { syncAcademicTermsFromAis } from '../src/services/integrations/academicInfoSystem/syncAcademicTerms.js';
import { syncDeanFromAis } from '../src/services/integrations/academicInfoSystem/syncDean.js';
import { syncFacultyStudentsFromAis } from '../src/services/integrations/academicInfoSystem/syncStudents.js';
import { syncFacultyCoursesFromAis } from '../src/services/integrations/academicInfoSystem/syncCourses.js';
import { syncFacultyLecturersFromAis } from '../src/services/integrations/academicInfoSystem/syncLecturers.js';
import { prisma } from '../src/db/prisma.js';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const facultyId = 12;
const facultyCode = 'EMS';
const facultyName = 'Economics and Management Science';

console.log('=== 1/7 Academic terms sync ===');
const terms = await syncAcademicTermsFromAis({ facultyId, dryRun: false });
console.log(JSON.stringify(terms, null, 2));

console.log('\n=== 2/7 Dean sync ===');
const dean = await syncDeanFromAis({ facultyCode, dryRun: false });
console.log(JSON.stringify(dean, null, 2));

console.log('\n=== 3/7 Faculty students sync ===');
const students = await syncFacultyStudentsFromAis({
  facultyId,
  facultyCode,
  facultyName,
  dryRun: false,
});
console.log(
  JSON.stringify(
    {
      batchesProcessed: students.batchesProcessed,
      fetched: students.fetched,
      created: students.created,
      updated: students.updated,
      errors: students.errors?.length ?? 0,
    },
    null,
    2
  )
);

console.log('\n=== 4/7 Repair batch cohorts ===');
execSync('node scripts/repair-batch-cohorts.js --apply', {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
});

console.log('\n=== 5/7 Faculty courses sync ===');
const courses = await syncFacultyCoursesFromAis({
  facultyId,
  facultyCode,
  facultyName,
  dryRun: false,
});
console.log(
  JSON.stringify(
    {
      batchesProcessed: courses.batchesProcessed,
      fetched: courses.fetched,
      coursesCreated: courses.coursesCreated,
      offeringsCreated: courses.offeringsCreated,
      errors: courses.errors?.length ?? 0,
    },
    null,
    2
  )
);

console.log('\n=== 6/7 Faculty lecturers sync ===');
const lecturers = await syncFacultyLecturersFromAis({
  facultyId,
  facultyCode,
  facultyName,
  assignOfferings: true,
  dryRun: false,
});
console.log(
  JSON.stringify(
    {
      fetched: lecturers.fetched,
      created: lecturers.created,
      updated: lecturers.updated,
      offeringsAssigned: lecturers.offeringsAssigned,
      errors: lecturers.errors?.length ?? 0,
    },
    null,
    2
  )
);

console.log('\n=== 7/7 Repair student registration terms ===');
execSync('node scripts/repair-student-registration-terms.js --apply', {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
});

const counts = {
  students: await prisma.user.count({ where: { role: { name: 'STUDENT' } } }),
  teachers: await prisma.user.count({ where: { role: { name: 'TEACHER' } } }),
  courses: await prisma.course.count(),
  offerings: await prisma.courseOffering.count(),
  batches: await prisma.batch.count(),
};

console.log('\n=== Done ===');
console.log(JSON.stringify(counts, null, 2));

await prisma.$disconnect();
