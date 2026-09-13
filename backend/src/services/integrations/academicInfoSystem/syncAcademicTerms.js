import { getAcademicInfoSystemAdapter } from './index.js';
import { ensureAcademicYearFromUniversityLabel } from './resolveAisSyncScope.js';

/**
 * Sync academic years + semesters from university AIS offerings API.
 * Uses GET /v1/courses/offerings (partner auth) — returns active term + AcademicYear on rows.
 *
 * @param {object} opts
 * @param {number} [opts.facultyId] — AIS faculty id (default 12 EMS)
 * @param {boolean} [opts.dryRun]
 */
export async function syncAcademicTermsFromAis(opts = {}) {
  const facultyId = Number(opts.facultyId ?? 12);
  const dryRun = Boolean(opts.dryRun);

  const adapter = getAcademicInfoSystemAdapter();
  if (!adapter.fetchActiveTerm || !adapter.collectAcademicYearLabels) {
    throw new Error('Academic term sync requires JazeeraUniversityAdapter');
  }

  const activeTerm = await adapter.fetchActiveTerm({ facultyId });
  const labels = await adapter.collectAcademicYearLabels({ facultyId });

  const summary = {
    dryRun,
    facultyId,
    activeTerm,
    labelsFound: labels,
    yearsCreated: 0,
    yearsExisting: 0,
    years: [],
  };

  for (const label of labels) {
    if (dryRun) {
      summary.years.push({ label, created: true });
      summary.yearsCreated += 1;
      continue;
    }

    const { year, created } = await ensureAcademicYearFromUniversityLabel(label);
    if (created) summary.yearsCreated += 1;
    else summary.yearsExisting += 1;
    summary.years.push({
      label,
      localName: year.name,
      id: year.id,
      semesters: year.semesters?.length ?? 0,
      created,
    });
  }

  return summary;
}
