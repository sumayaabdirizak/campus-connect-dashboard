import { buildPhaseA1Context } from './setup.js';
import { fetchEngagementMetrics } from './fetchEngagement.js';
import { fetchOrgMetrics } from './fetchOrg.js';
import { fetchGrowthMetrics } from './fetchGrowth.js';

/** @param {{ facultyId?: number|null, periodMonths?: number }} args */
export async function runAnalyticsPhaseA1(args = {}) {
  const base = await buildPhaseA1Context(args);
  const [engagement, org, growth] = await Promise.all([
    fetchEngagementMetrics(base),
    fetchOrgMetrics(base),
    fetchGrowthMetrics(base),
  ]);
  return { ...base, ...engagement, ...org, ...growth };
}
