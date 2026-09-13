import { format } from 'date-fns';

/** Shared column labels for list + detail tables and exports. */
export const REPORT_TABLE_LABELS: Record<string, string> = {
  course: 'Code',
  title: 'Course',
  name: 'Name',
  teacher: 'Teacher',
  staffNumber: 'Staff no.',
  studentNumber: 'Student no.',
  batch: 'Batch',
  section: 'Section',
  programme: 'Programme',
  status: 'Status',
  mode: 'Mode',
  type: 'Type',
  code: 'Code',
  departments: 'Departments',
  clubs: 'Clubs',
  sections: 'Sections',
  students: 'Students',
  courses: 'Courses (this term)',
  quizzes: 'Quizzes',
  assignments: 'Assignments',
  resources: 'Resources',
  posts: 'Feed posts',
  attempts: 'Quiz attempts',
  submissions: 'Submissions',
  questions: 'Questions',
  avgScore: 'Avg score',
  due: 'Due',
  graded: 'Graded',
  views: 'Views',
  created: 'Created',
  replies: 'Replies',
  reactions: 'Reactions',
  published: 'Published',
  reads: 'Reads',
  comments: 'Comments',
  acknowledgements: 'Acks',
  members: 'Members',
  lastActivity: 'Last activity'
};

const DATE_KEYS = new Set(['due', 'created', 'published', 'lastActivity']);

export function labelForColumn(key: string): string {
  return REPORT_TABLE_LABELS[key] ?? key;
}

export function formatReportCell(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (DATE_KEYS.has(key)) {
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? '—' : format(d, 'd MMM yyyy');
  }
  if (key === 'avgScore') return `${value}%`;
  return String(value);
}

export function reportTableColumns(rows: Record<string, unknown>[]): string[] {
  if (rows.length === 0) return [];
  return Object.keys(rows[0]).filter((c) => c !== 'id');
}
