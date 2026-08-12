import type { Assignment, SubmissionExtension } from '@/lib/course-details/services/assignments-types';
import { statusOf, type GroupRow, type SubmissionRow } from './shared';
import type { SubmissionFilter, SubmissionSortKey } from './use-submission-rows';

export function filterAndSortStudentRows(args: {
  rows: SubmissionRow[];
  assignment: Assignment;
  extensions: SubmissionExtension[];
  filter: SubmissionFilter;
  search: string;
  sort: { key: SubmissionSortKey; dir: 'asc' | 'desc' };
}) {
  const { rows, assignment, extensions, filter, search, sort } = args;
  return rows
    .filter((row) => {
      if (filter === 'all') return true;
      if (filter === 'ungraded') return !(row.submission?.is_reviewed ?? false);
      if (filter === 'graded') return row.submission?.is_reviewed ?? false;
      return statusOf(assignment, row.submission ?? undefined, extensions) === filter;
    })
    .filter((row) => {
      if (!search.trim()) return true;
      const needle = search.toLowerCase();
      return (
        row.student.full_name.toLowerCase().includes(needle) ||
        row.student.number.toLowerCase().includes(needle) ||
        row.student.email.toLowerCase().includes(needle)
      );
    })
    .toSorted((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1;
      switch (sort.key) {
        case 'name':
          return a.student.full_name.localeCompare(b.student.full_name) * dir;
        case 'submitted_at': {
          const av = a.submission?.submitted_at
            ? new Date(a.submission.submitted_at).getTime()
            : 0;
          const bv = b.submission?.submitted_at
            ? new Date(b.submission.submitted_at).getTime()
            : 0;
          return (av - bv) * dir;
        }
        case 'grade': {
          const av = a.submission?.grade;
          const bv = b.submission?.grade;
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          return (av - bv) * dir;
        }
        case 'status': {
          const sa = statusOf(assignment, a.submission ?? undefined, extensions);
          const sb = statusOf(assignment, b.submission ?? undefined, extensions);
          return sa.localeCompare(sb) * dir;
        }
      }
    });
}

export function filterAndSortGroupRows(args: {
  rows: GroupRow[];
  filter: SubmissionFilter;
  search: string;
  sort: { key: SubmissionSortKey; dir: 'asc' | 'desc' };
}) {
  const { rows, filter, search, sort } = args;
  return rows
    .filter((row) => {
      if (filter === 'all') return true;
      if (filter === 'ungraded') return !(row.submission?.is_reviewed ?? false);
      if (filter === 'graded') return row.submission?.is_reviewed ?? false;
      if (filter === 'submitted') return row.submission !== null;
      if (filter === 'missing') return row.submission === null;
      if (filter === 'late') return row.submission?.is_late ?? false;
      return true;
    })
    .filter((row) => {
      if (!search.trim()) return true;
      const needle = search.toLowerCase();
      return (
        row.groupName.toLowerCase().includes(needle) ||
        row.members.some((m) => m.full_name.toLowerCase().includes(needle))
      );
    })
    .toSorted((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1;
      switch (sort.key) {
        case 'name':
          return a.groupName.localeCompare(b.groupName) * dir;
        case 'submitted_at': {
          const av = a.submission?.submitted_at
            ? new Date(a.submission.submitted_at).getTime()
            : 0;
          const bv = b.submission?.submitted_at
            ? new Date(b.submission.submitted_at).getTime()
            : 0;
          return (av - bv) * dir;
        }
        case 'grade': {
          const av = a.submission?.grade;
          const bv = b.submission?.grade;
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          return (av - bv) * dir;
        }
        case 'status':
          return 0;
      }
    });
}
