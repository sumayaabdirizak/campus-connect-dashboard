import { runAnalyticsPhaseA } from './phase-a.js';
import { runAnalyticsPhaseB } from './phase-b.js';
import { runAnalyticsPhaseC } from './phase-c.js';

export async function buildPlatformAnalytics(args = {}) {
  const a = await runAnalyticsPhaseA(args);
  const b = await runAnalyticsPhaseB(a);
  return runAnalyticsPhaseC(b);
}
