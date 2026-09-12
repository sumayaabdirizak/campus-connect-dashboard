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
      if (filter === 'ungraded') {
        return row.submission != null && !(row.submission.is_reviewed ?? false);
      }
      if (filter === 'graded') return row.submission?.is_reviewed ?? false;
      // Missing = past close with no submission. Pending/extended still have time.
      if (filter === 'missing') {
        const st = statusOf(assignment, row.submission ?? undefined, extensions, {
          studentId: row.studentId
        });
        return st === 'missing';
      }
      return (
        statusOf(assignment, row.submission ?? undefined, extensions, {
          studentId: row.studentId
        }) === filter
      );
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
          const sa = statusOf(assignment, a.submission ?? undefined, extensions, {
            studentId: a.studentId
          });
          const sb = statusOf(assignment, b.submission ?? undefined, extensions, {
            studentId: b.studentId
          });
          return sa.localeCompare(sb) * dir;
        }
      }
    });
}

export function filterAndSortGroupRows(args: {
  rows: GroupRow[];
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
      if (filter === 'ungraded') {
        return row.submission != null && !(row.submission.is_reviewed ?? false);
      }
      if (filter === 'graded') return row.submission?.is_reviewed ?? false;
      if (filter === 'submitted') {
        return row.submission != null && !row.submission.is_late;
      }
      if (filter === 'missing') {
        return (
          statusOf(assignment, row.submission ?? undefined, extensions, {
            groupId: row.groupId
          }) === 'missing'
        );
      }
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
        case 'status': {
          const sa = statusOf(assignment, a.submission ?? undefined, extensions, {
            groupId: a.groupId
          });
          const sb = statusOf(assignment, b.submission ?? undefined, extensions, {
            groupId: b.groupId
          });
          return sa.localeCompare(sb) * dir;
        }
      }
    });
}

export function submissionStatusCounts(args: {
  isGroupMode: boolean;
  studentRows: SubmissionRow[];
  groupRows: GroupRow[];
  assignment: Assignment;
  extensions: SubmissionExtension[];
}) {
  const { isGroupMode, studentRows, groupRows, assignment, extensions } = args;

  if (isGroupMode) {
    const status = (row: GroupRow) =>
      statusOf(assignment, row.submission ?? undefined, extensions, {
        groupId: row.groupId
      });
    return {
      all: groupRows.length,
      submitted: groupRows.filter((r) => status(r) === 'submitted').length,
      late: groupRows.filter((r) => status(r) === 'late').length,
      missing: groupRows.filter((r) => status(r) === 'missing').length,
      ungraded: groupRows.filter(
        (r) => r.submission != null && !(r.submission.is_reviewed ?? false)
      ).length,
      graded: groupRows.filter((r) => r.submission?.is_reviewed).length
    };
  }

  const status = (row: SubmissionRow) =>
    statusOf(assignment, row.submission ?? undefined, extensions, {
      studentId: row.studentId
    });

  return {
    all: studentRows.length,
    submitted: studentRows.filter((r) => status(r) === 'submitted').length,
    late: studentRows.filter((r) => status(r) === 'late').length,
    missing: studentRows.filter((r) => status(r) === 'missing').length,
    ungraded: studentRows.filter(
      (r) => r.submission != null && !(r.submission.is_reviewed ?? false)
    ).length,
    graded: studentRows.filter((r) => r.submission?.is_reviewed).length
  };
}
