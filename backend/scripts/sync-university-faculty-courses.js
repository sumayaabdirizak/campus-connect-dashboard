import { syncFacultyCoursesFromAis } from '../src/services/integrations/academicInfoSystem/syncCourses.js';

const summary = await syncFacultyCoursesFromAis({
  facultyId: 12,
  facultyCode: 'EMS',
  facultyName: 'Economics and Management Science',
  term: 'current',
  dryRun: false,
});

console.log(JSON.stringify(summary, null, 2));
