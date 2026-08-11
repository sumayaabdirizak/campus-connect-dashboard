'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@/lib/async-query';
import { PosTableCard } from '@/features/pos/components/pos-table-card';
import { PosTablePagination } from '@/features/pos/components/pos-table-pagination';
import { PosTable, PosTableBody, PosTableHead, PosTableHeaderCell, PosTableCell, PosTableRow } from '@/features/pos/components/pos-table';
import { Badge } from '@/features/ui/components/badge';
import { downloadCsv } from '@/features/pos/components/download-csv';
import { exportTablePdf } from '@/features/pos/components/export-pdf';
import { showToast } from '@/lib/notifications';
import { fetchTeacherActivity } from '@/lib/reports/queries';
import type { OversightScope, TeacherActivityRow } from '@/lib/reports/types';

const COLUMN_OPTS = [
  { id: 'teacher', label: 'Teacher' },
  { id: 'department', label: 'Department' },
  { id: 'courses', label: 'Courses' },
  { id: 'feed', label: 'Feed posts' },
  { id: 'chat', label: 'Course chat' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'quizzes', label: 'Quizzes' },
  { id: 'graded', label: 'Graded' },
  { id: 'resources', label: 'Resources' },
  { id: 'lastLogin', label: 'Last active' }
] as const;
const ALL_COLS = COLUMN_OPTS.map((c) => c.id);

const SORT_OPTS = [
  { id: 'name-asc', label: 'Name A–Z' },
  { id: 'graded-desc', label: 'Most graded' },
  { id: 'feed-desc', label: 'Most feed posts' },
  { id: 'login-desc', label: 'Most recently active' }
];

function sortRows(rows: TeacherActivityRow[], sortId: string) {
  const copy = [...rows];
  switch (sortId) {
    case 'graded-desc':
      return copy.sort((a, b) => b.gradedCount - a.gradedCount);
    case 'feed-desc':
      return copy.sort((a, b) => b.feedPostsCount - a.feedPostsCount);
    case 'login-desc':
      return copy.sort((a, b) => {
        const ta = a.lastLoginAt ? Date.parse(a.lastLoginAt) : 0;
        const tb = b.lastLoginAt ? Date.parse(b.lastLoginAt) : 0;
        return tb - ta;
      });
    default:
      return copy.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }
}

export function TeacherActivityTab({ scope, facultyId }: { scope: OversightScope; facultyId?: number | null }) {
  const [search, setSearch] = useState('');
  const [sortId, setSortId] = useState('name-asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [visibleCols, setVisibleCols] = useState<string[]>([...ALL_COLS]);
  const col = (id: string) => visibleCols.includes(id);

  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', scope, 'teacher-activity', facultyId ?? null, search],
    queryFn: () => fetchTeacherActivity(scope, { search, facultyId })
  });

  const allRows = data?.results ?? [];
  const sorted = useMemo(() => sortRows(allRows, sortId), [allRows, sortId]);

  useEffect(() => {
    setPage(1);
  }, [search, sortId]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const exportHeader = [
    'Teacher',
    'Email',
    'Department',
    'Courses',
    'Feed posts',
    'Course chat messages',
    'Assignments',
    'Quizzes',
    'Graded',
    'Resources',
    'Last active'
  ];
  const exportRows = useMemo(
    () =>
      sorted.map((r) => [
        r.fullName,
        r.email,
        r.department?.name ?? '',
        r.courseCount,
        r.feedPostsCount,
        r.chatMessagesCount,
        r.assignmentsCount,
        r.quizzesCount,
        r.gradedCount,
        r.resourcesCount,
        r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString() : 'Never'
      ]),
    [sorted]
  );

  if (isLoading && !data) {
    return (
      <div className='flex h-48 items-center justify-center rounded-xl border bg-card'>
        <div className='size-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
      </div>
    );
  }
  if (error) {
    return (
      <div className='rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive'>
        Failed to load teacher activity: {(error as Error).message}
      </div>
    );
  }

  return (
    <PosTableCard
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder='Search teacher name or email...'
      columns={[...COLUMN_OPTS]}
      visibleColumnIds={visibleCols}
      onVisibleColumnsChange={setVisibleCols}
      sortOptions={SORT_OPTS}
      sortId={sortId}
      onSortChange={setSortId}
      onExportExcel={() => {
        downloadCsv('teacher-activity.csv', exportHeader, exportRows);
        showToast('success', 'Exported teacher-activity.csv');
      }}
      onExportPdf={() => exportTablePdf('Teacher Activity', exportHeader, exportRows)}
      footer={
        sorted.length > 0 ? (
          <PosTablePagination
            page={page}
            pageSize={pageSize}
            total={sorted.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel='teachers'
          />
        ) : null
      }
    >
      {sorted.length === 0 ? (
        <div className='p-10 text-center'>
          <p className='font-medium'>{search ? 'No matches' : 'No teachers found'}</p>
        </div>
      ) : (
        <PosTable>
          <PosTableHead>
            <tr>
              {col('teacher') ? <PosTableHeaderCell>Teacher</PosTableHeaderCell> : null}
              {col('department') ? <PosTableHeaderCell>Department</PosTableHeaderCell> : null}
              {col('courses') ? <PosTableHeaderCell>Courses</PosTableHeaderCell> : null}
              {col('feed') ? <PosTableHeaderCell>Feed posts</PosTableHeaderCell> : null}
              {col('chat') ? <PosTableHeaderCell>Course chat</PosTableHeaderCell> : null}
              {col('assignments') ? <PosTableHeaderCell>Assignments</PosTableHeaderCell> : null}
              {col('quizzes') ? <PosTableHeaderCell>Quizzes</PosTableHeaderCell> : null}
              {col('graded') ? <PosTableHeaderCell>Graded</PosTableHeaderCell> : null}
              {col('resources') ? <PosTableHeaderCell>Resources</PosTableHeaderCell> : null}
              {col('lastLogin') ? <PosTableHeaderCell>Last active</PosTableHeaderCell> : null}
            </tr>
          </PosTableHead>
          <PosTableBody>
            {pageRows.map((r) => (
              <PosTableRow key={r.userId}>
                {col('teacher') ? (
                  <PosTableCell>
                    <p className='text-sm font-medium'>{r.fullName}</p>
                    <p className='text-xs text-muted-foreground'>{r.email}</p>
                  </PosTableCell>
                ) : null}
                {col('department') ? (
                  <PosTableCell>
                    {r.department ? (
                      <Badge variant='outline' className='text-xs'>
                        {r.department.name}
                      </Badge>
                    ) : (
                      <span className='text-muted-foreground text-xs'>—</span>
                    )}
                  </PosTableCell>
                ) : null}
                {col('courses') ? <PosTableCell>{r.courseCount}</PosTableCell> : null}
                {col('feed') ? <PosTableCell>{r.feedPostsCount}</PosTableCell> : null}
                {col('chat') ? <PosTableCell>{r.chatMessagesCount}</PosTableCell> : null}
                {col('assignments') ? <PosTableCell>{r.assignmentsCount}</PosTableCell> : null}
                {col('quizzes') ? <PosTableCell>{r.quizzesCount}</PosTableCell> : null}
                {col('graded') ? (
                  <PosTableCell>
                    <Badge variant='outline' className='border-success/20 bg-success-muted text-success'>
                      {r.gradedCount}
                    </Badge>
                  </PosTableCell>
                ) : null}
                {col('resources') ? <PosTableCell>{r.resourcesCount}</PosTableCell> : null}
                {col('lastLogin') ? (
                  <PosTableCell>
                    <span className='text-xs text-muted-foreground'>
                      {r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleDateString() : 'Never'}
                    </span>
                  </PosTableCell>
                ) : null}
              </PosTableRow>
            ))}
          </PosTableBody>
        </PosTable>
      )}
    </PosTableCard>
  );
}
