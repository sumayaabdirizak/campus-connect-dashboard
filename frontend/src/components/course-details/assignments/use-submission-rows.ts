'use client';

import { useMemo } from 'react';
import type { Submission } from '@/lib/course-details/services/assignments-types';
import type { CourseGroup } from '@/lib/course-details/services/groups-types';
import { type GroupRow, type SubmissionRow } from './shared';

export type SubmissionSortKey = 'name' | 'submitted_at' | 'grade' | 'status';
export type SubmissionFilter =
  | 'all'
  | 'submitted'
  | 'late'
  | 'missing'
  | 'ungraded'
  | 'graded';

type RosterStudent = { id: number; full_name: string; email: string; number: string };

export function useSubmissionRowMaps(args: {
  submissions: Submission[];
  roster: RosterStudent[];
  groups: CourseGroup[];
}) {
  const { submissions, roster, groups } = args;

  const submissionsByStudent = useMemo(() => {
    const m = new Map<number, Submission>();
    for (const s of submissions) m.set(s.studentId, s);
    return m;
  }, [submissions]);

  const allStudentRows = useMemo<SubmissionRow[]>(
    () =>
      roster.map((rs) => ({
        studentId: rs.id,
        student: rs,
        submission: submissionsByStudent.get(rs.id) ?? null
      })),
    [roster, submissionsByStudent]
  );

  const submissionsByGroup = useMemo(() => {
    const m = new Map<number, Submission>();
    for (const s of submissions) {
      if (s.groupId != null && !m.has(s.groupId)) m.set(s.groupId, s);
    }
    return m;
  }, [submissions]);

  const allGroupRows = useMemo<GroupRow[]>(
    () =>
      groups.map((g) => ({
        groupId: g.id,
        groupName: g.name,
        members: g.members.map((m) => m.member),
        submission: submissionsByGroup.get(g.id) ?? null
      })),
    [groups, submissionsByGroup]
  );

  return { submissionsByStudent, allStudentRows, submissionsByGroup, allGroupRows };
}

export {
  filterAndSortStudentRows,
  filterAndSortGroupRows
} from './filter-sort-submission-rows';
