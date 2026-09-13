import { syncDeanFromAis } from '../src/services/integrations/academicInfoSystem/syncDean.js';

const summary = await syncDeanFromAis({
  facultyCode: 'EMS',
  dryRun: false,
});

console.log(JSON.stringify(summary, null, 2));
