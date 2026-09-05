import { syncFacultyLecturersFromAis } from '../src/services/integrations/academicInfoSystem/syncLecturers.js';

const summary = await syncFacultyLecturersFromAis({
  facultyId: 12,
  facultyCode: 'EMS',
  facultyName: 'Economics and Management Science',
  assignOfferings: true,
  dryRun: false,
});

console.log(JSON.stringify(summary, null, 2));
