import { runAnalyticsPhaseA } from './phase-a.js';
import { runAnalyticsPhaseB } from './phase-b.js';
import { runAnalyticsPhaseC } from './phase-c.js';
import { getCachedPlatformAnalytics, setCachedPlatformAnalytics } from './cache.js';

export async function buildPlatformAnalytics(args = {}) {
  const cached = getCachedPlatformAnalytics(args);
  if (cached) return cached;

  const a = await runAnalyticsPhaseA(args);
  const b = await runAnalyticsPhaseB(a);
  const result = await runAnalyticsPhaseC(b);
  setCachedPlatformAnalytics(args, result);
  return result;
}
