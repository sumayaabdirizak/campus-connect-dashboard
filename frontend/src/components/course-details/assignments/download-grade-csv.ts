import { format } from 'date-fns';
import type { Assignment, Submission, SubmissionExtension } from '@/lib/course-details/services/assignments-types';
import { statusOf, type SubmissionRow } from './shared';

function csvSafe(value: unknown) {
  let s = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function downloadGradeCsv(args: {
  assignment: Assignment;
  rows: SubmissionRow[];
  extensions: SubmissionExtension[];
}) {
  const { assignment, rows, extensions } = args;
  const header = ['Name', 'Student ID', 'Email', 'Submitted At', 'Status', 'Grade (%)', 'Feedback'];
  const body = rows.map(({ student, submission: sub }) => {
    const status = statusOf(assignment, sub ?? undefined, extensions, {
      studentId: student.id
    });
    return [
      student.full_name,
      student.number,
      student.email,
      sub?.submitted_at ? format(new Date(sub.submitted_at), 'yyyy-MM-dd HH:mm') : '',
      status,
      sub?.grade != null ? String(sub.grade) : '',
      sub?.feedback ?? '',
    ];
  });
  const csv = [header, ...body].map((r) => r.map(csvSafe).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${assignment.title.replace(/[^a-z0-9]+/gi, '_')}_grades.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
