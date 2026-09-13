import { resolveScope } from './resolveScope.js';
import {
  announcementsDomain,
  assignmentsDomain,
  clubsDomain,
  discussionsDomain,
  quizzesDomain,
  resourcesDomain,
} from './domains.js';

export const REPORT_SCOPES = ['course', 'teacher', 'student', 'batch', 'section', 'faculty'];

/** Which activity domains make sense for each scope. */
const DOMAINS_BY_SCOPE = {
  course: ['quizzes', 'assignments', 'resources', 'discussions', 'announcements'],
  teacher: ['quizzes', 'assignments', 'resources', 'discussions', 'announcements'],
  student: ['quizzes', 'assignments', 'resources', 'discussions'],
  batch: ['quizzes', 'assignments', 'resources', 'discussions', 'announcements'],
  section: ['quizzes', 'assignments', 'resources', 'discussions', 'announcements'],
  faculty: ['quizzes', 'assignments', 'resources', 'discussions', 'announcements', 'clubs'],
};

const DOMAIN_FNS = {
  quizzes: quizzesDomain,
  assignments: assignmentsDomain,
  resources: resourcesDomain,
  discussions: discussionsDomain,
  announcements: announcementsDomain,
  clubs: clubsDomain,
};

const DOMAIN_LABELS = {
  quizzes: 'Quizzes',
  assignments: 'Assignments',
  resources: 'Resources',
  discussions: 'Course feed',
  announcements: 'Announcements',
  clubs: 'Clubs',
};

function periodStart(months) {
  if (!months || months <= 0) return null;
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

/**
 * Build one report. Scope decides *what* is measured; the domains decide
 * *which* activity is counted. Domains run in parallel — they touch different
 * tables and none depends on another's result.
 */
export async function buildReport({
  scope,
  id,
  since = null,
  until = null,
  months = 0,
}) {
  if (!REPORT_SCOPES.includes(scope)) {
    const err = new Error(`Unknown report scope: ${scope}`);
    err.status = 400;
    throw err;
  }

  const resolved = await resolveScope(scope, id);
  if (!resolved) {
    const err = new Error('Report subject not found');
    err.status = 404;
    throw err;
  }

  const names = DOMAINS_BY_SCOPE[scope];
  const ctx = { ...resolved, scope };
  const window = {
    since: since ?? periodStart(months),
    until,
  };

  // Isolate domain failures — one broken table/query must not blank the whole report.
  const results = await Promise.all(
    names.map(async (name) => {
      try {
        return await DOMAIN_FNS[name](ctx, window);
      } catch (err) {
        console.error('[reports] domain failed', {
          scope,
          id: resolved.subject?.id,
          domain: name,
          message: err?.message,
        });
        return {
          kpis: [{ key: `${name}Error`, label: 'Unavailable', value: null }],
          rows: [],
          error: err?.message || 'Failed to load this section',
        };
      }
    })
  );

  const sections = names.map((name, i) => ({
    key: name,
    label: DOMAIN_LABELS[name],
    ...results[i],
  }));

  return {
    scope,
    subject: resolved.subject,
    period: {
      months: months || 0,
      since: window.since ? window.since.toISOString() : null,
      until: window.until ? window.until.toISOString() : null,
    },
    coverage: {
      courses: resolved.offeringIds.length,
      students: resolved.studentIds ? resolved.studentIds.length : null,
    },
    // Flattened headline numbers so the UI can render a KPI strip without
    // knowing which domain produced what.
    kpis: sections.flatMap((s) => s.kpis.map((k) => ({ ...k, domain: s.key }))),
    sections,
  };
}
