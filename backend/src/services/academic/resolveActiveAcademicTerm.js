import {
  getCurrentAcademicYearBounds,
  getSemesterInYear,
} from './academicCalendar.js';
import { getAcademicInfoSystemAdapter } from '../integrations/academicInfoSystem/index.js';
import { isUniversityAisConfigured } from '../integrations/universityApi/config.js';
import {
  ensureAcademicYearFromUniversityLabel,
  resolveAcademicYearByLabel,
  resolveSemesterForYear,
} from '../integrations/academicInfoSystem/resolveAisSyncScope.js';

const CACHE_TTL_MS = 60_000;

/** @type {{ expiresAt: number; snapshot: object | null }} */
let cache = { expiresAt: 0, snapshot: null };

function calendarSnapshot(forDate = new Date()) {
  const bounds = getCurrentAcademicYearBounds(forDate);
  const slot = getSemesterInYear(forDate);
  return {
    source: 'calendar',
    academicYearLabel: bounds.name.replace(/\//g, '-'),
    academicYearName: bounds.name,
    semesterNumberInYear: slot,
  };
}

/**
 * Active academic term from local calendar only (sync, no network).
 */
export function getActiveAcademicTermCalendarSnapshot(forDate = new Date()) {
  return calendarSnapshot(forDate);
}

/**
 * Active term — university AIS when configured, otherwise academic calendar.
 *
 * @param {object} [opts]
 * @param {number} [opts.facultyId] — AIS faculty id (default 12)
 * @param {boolean} [opts.includeDb] — resolve local AcademicYear + Semester ids
 * @param {boolean} [opts.skipCache]
 */
export async function resolveActiveAcademicTerm(opts = {}) {
  const facultyId = Number(opts.facultyId ?? 12);
  const includeDb = Boolean(opts.includeDb);
  const skipCache = Boolean(opts.skipCache);

  if (
    !skipCache &&
    cache.expiresAt > Date.now() &&
    cache.snapshot &&
    (!includeDb || cache.snapshot.academicYearId)
  ) {
    return { ...cache.snapshot };
  }

  let snapshot = calendarSnapshot();

  if (isUniversityAisConfigured()) {
    try {
      const adapter = getAcademicInfoSystemAdapter();
      if (adapter.fetchActiveTerm) {
        const term = await adapter.fetchActiveTerm({ facultyId });
        if (term?.academicYearLabel) {
          snapshot = {
            source: 'university',
            academicYearLabel: String(term.academicYearLabel).trim(),
            academicYearName: String(term.academicYearLabel).trim().replace(/-/g, '/'),
            semesterNumberInYear: Number(term.semesterNumber) || 1,
          };
        }
      }
    } catch (err) {
      console.warn(
        'resolveActiveAcademicTerm: university fetch failed, using calendar',
        err?.message
      );
    }
  }

  if (includeDb) {
    let year;
    if (snapshot.source === 'university') {
      const ensured = await ensureAcademicYearFromUniversityLabel(snapshot.academicYearLabel);
      year = ensured.year;
    } else {
      year = await resolveAcademicYearByLabel(snapshot.academicYearName);
    }

    if (year) {
      snapshot.academicYearId = year.id;
      snapshot.academicYearName = year.name;
      const semester = await resolveSemesterForYear(
        year.id,
        snapshot.semesterNumberInYear
      );
      if (semester?.id) {
        snapshot.semesterId = semester.id;
      }
    }
  }

  if (!skipCache) {
    cache = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      snapshot: { ...snapshot },
    };
  }

  return snapshot;
}
