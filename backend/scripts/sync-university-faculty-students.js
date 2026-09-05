import { syncFacultyStudentsFromAis } from '../src/services/integrations/academicInfoSystem/syncStudents.js';

const summary = await syncFacultyStudentsFromAis({
  facultyId: 12,
  facultyCode: 'EMS',
  facultyName: 'Economics and Management Science',
  dryRun: false,
});

console.log(JSON.stringify(summary, null, 2));
