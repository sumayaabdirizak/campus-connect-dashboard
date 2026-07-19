'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import type { Assignment, Submission, SubmissionExtension } from '../../api/assignments-types';
import type { GroupRow, SubmissionRow } from './shared';
import { GroupSubmissionRow } from './group-submission-row';
import { StudentSubmissionRow } from './student-submission-row';
import { SubmissionsSortHeader } from './submissions-sort-header';
import type { SubmissionFilter, SubmissionSortKey } from './use-submission-rows';

type Props = {
  isGroupMode: boolean;
  loading: boolean;
  filter: SubmissionFilter;
  search: string;
  subSort: { key: SubmissionSortKey; dir: 'asc' | 'desc' };
  onSort: (key: SubmissionSortKey) => void;
  selectedRows: Set<number>;
  onToggleRow: (id: number, checked: boolean) => void;
  onGrade: (sub: Submission) => void;
  filteredGroupSubs: GroupRow[];
  filteredSubs: SubmissionRow[];
  groupsEmpty: boolean;
  rosterEmpty: boolean;
  assignment: Assignment;
  extensions: SubmissionExtension[];
};

export function SubmissionsTable(p: Props) {
  const emptyMsg = (kind: 'group' | 'student') =>
    p.search.trim() || p.filter !== 'all'
      ? `No ${kind === 'group' ? 'groups' : 'students'} match your filters.`
      : kind === 'group'
        ? p.groupsEmpty
          ? 'No groups created yet — go to the Groups tab first.'
          : 'No submissions yet.'
        : p.rosterEmpty
          ? 'No students enrolled yet.'
          : 'No submissions yet.';

  return (
    <div className='overflow-hidden rounded-lg border bg-card shadow-sm'>
      <div className='max-h-[64vh] overflow-auto'>
        <Table className='min-w-[980px]'>
          <TableHeader className='sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85'>
            <TableRow className='hover:bg-transparent border-b [&>th]:h-10 [&>th]:text-[11px] [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground'>
              <TableHead className='w-10'></TableHead>
              <TableHead>
                <SubmissionsSortHeader
                  label={p.isGroupMode ? 'Group' : 'Student'}
                  sortKey='name'
                  subSort={p.subSort}
                  onSort={p.onSort}
                />
              </TableHead>
              {p.isGroupMode ? <TableHead>Members</TableHead> : null}
              <TableHead>
                <SubmissionsSortHeader label='Submitted' sortKey='submitted_at' subSort={p.subSort} onSort={p.onSort} />
              </TableHead>
              {!p.isGroupMode ? <TableHead>Effective due</TableHead> : null}
              <TableHead>
                <SubmissionsSortHeader label='Status' sortKey='status' subSort={p.subSort} onSort={p.onSort} />
              </TableHead>
              <TableHead>
                <SubmissionsSortHeader label='Grade' sortKey='grade' subSort={p.subSort} onSort={p.onSort} />
              </TableHead>
              <TableHead className='w-14'>File</TableHead>
              <TableHead className='w-32'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {p.isGroupMode && p.filteredGroupSubs.length === 0 && !p.loading ? (
              <TableRow>
                <TableCell colSpan={8} className='text-center py-8 text-sm text-muted-foreground'>
                  {emptyMsg('group')}
                </TableCell>
              </TableRow>
            ) : null}
            {p.isGroupMode
              ? p.filteredGroupSubs.map((row) => (
                  <GroupSubmissionRow
                    key={row.groupId}
                    row={row}
                    selected={p.selectedRows.has(row.groupId)}
                    onToggle={p.onToggleRow}
                    onGrade={p.onGrade}
                  />
                ))
              : null}
            {!p.isGroupMode && p.filteredSubs.length === 0 && !p.loading ? (
              <TableRow>
                <TableCell colSpan={8} className='text-center py-8 text-sm text-muted-foreground'>
                  {emptyMsg('student')}
                </TableCell>
              </TableRow>
            ) : null}
            {!p.isGroupMode
              ? p.filteredSubs.map((row) => (
                  <StudentSubmissionRow
                    key={row.studentId}
                    row={row}
                    assignment={p.assignment}
                    extensions={p.extensions}
                    selected={p.selectedRows.has(row.studentId)}
                    onToggle={p.onToggleRow}
                    onGrade={p.onGrade}
                  />
                ))
              : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
