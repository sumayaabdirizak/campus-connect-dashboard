import { runAnalyticsPhaseA1 } from './phase-a1/index.js';
import { runAnalyticsPhaseA2 } from './phase-a2/index.js';

export async function runAnalyticsPhaseA(args = {}) {
  const a1 = await runAnalyticsPhaseA1(args);
  return runAnalyticsPhaseA2(a1);
}
