import type { ReportScope } from '@/lib/reports/types';

/** List table columns per scope — stable when the API returns zero rows. */
export const REPORT_SCOPE_COLUMNS: Record<ReportScope, string[]> = {
  course: [
    'course',
    'title',
    'teacher',
    'batch',
    'section',
    'quizzes',
    'assignments',
    'resources',
    'attempts',
    'submissions'
  ],
  teacher: ['name', 'staffNumber', 'courses', 'quizzes', 'assignments', 'resources'],
  student: [
    'name',
    'studentNumber',
    'batch',
    'section',
    'courses',
    'attempts',
    'submissions'
  ],
  batch: ['name', 'programme', 'status', 'students', 'courses', 'quizzes', 'assignments'],
  section: ['name', 'batch', 'programme', 'students', 'courses', 'quizzes', 'assignments'],
  faculty: [
    'name',
    'code',
    'departments',
    'clubs',
    'courses',
    'quizzes',
    'assignments',
    'resources'
  ]
};

/** Search box hints — words can match any column (e.g. name + batch). */
export const REPORT_SEARCH_PLACEHOLDER: Record<ReportScope, string> = {
  course: 'Search courses — code, title, teacher, batch…',
  teacher: 'Search teachers — name, staff number…',
  student: 'Search students — name, number, batch, section…',
  batch: 'Search batches — name, programme, status…',
  section: 'Search sections — name, batch, programme…',
  faculty: 'Search faculties — name, code…'
};
