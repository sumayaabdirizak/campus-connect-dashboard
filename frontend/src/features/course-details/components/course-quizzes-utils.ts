import { getApiBaseUrl } from '@/lib/api-config';
import type { CourseModule } from '../api/resources-types';
import type { Quiz } from '../api/quizzes-types';

export function formatSeconds(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/** How long to wait after the last answer change before autosaving. */
export const AUTOSAVE_DEBOUNCE_MS = 1500;

export const QUIZ_API_BASE = getApiBaseUrl();

export function readCsrfCookie(): string {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

/** Group quizzes by module position; ungrouped bucket last. */
export function groupQuizzesByModule(
  quizzes: Quiz[],
  modules: CourseModule[]
): Array<{ module: CourseModule | null; quizzes: Quiz[] }> {
  const byId = new Map<number | 'none', Quiz[]>();
  for (const q of quizzes) {
    const key: number | 'none' = q.moduleId ?? 'none';
    const list = byId.get(key) ?? [];
    list.push(q);
    byId.set(key, list);
  }
  const buckets: Array<{ module: CourseModule | null; quizzes: Quiz[] }> = [];
  for (const m of [...modules].sort((a, b) => a.position - b.position)) {
    const rows = byId.get(m.id);
    if (rows && rows.length > 0) buckets.push({ module: m, quizzes: rows });
  }
  const orphan = byId.get('none');
  if (orphan && orphan.length > 0) buckets.push({ module: null, quizzes: orphan });
  return buckets;
}
