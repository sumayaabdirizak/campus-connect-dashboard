import { syncAcademicTermsFromAis } from '../src/services/integrations/academicInfoSystem/syncAcademicTerms.js';

const summary = await syncAcademicTermsFromAis({
  facultyId: 12,
  dryRun: false,
});

console.log(JSON.stringify(summary, null, 2));
