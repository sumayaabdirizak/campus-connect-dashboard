'use client';

import { useMemo, useState } from 'react';
import { Search, Download, GraduationCap, Users, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EmptyState } from './_shared/empty-state';
import { ListSkeleton } from './_shared/list-skeleton';
import { QueryErrorState } from '@/components/query-error-state';
import { StudentProfileDrawer } from './student-profile-drawer';
import { useGradebook } from '../api/gradebook-queries';
import type {
  Gradebook,
  GradebookAssignmentCell,
  GradebookColumns,
  GradebookQuizCell,
  GradebookRow
} from '../api/gradebook-types';
import type { RosterStudent } from '../api/roster-types';

interface CourseGradebookProps {
  courseId: string;
}

type GradeFilter = 'all' | 'needs_grading';

function fmtPct(pct: number | null): string {
  return pct == null ? '—' : `${Math.round(pct)}%`;
}

function computeOverallPoints(
  row: GradebookRow,
  columns: GradebookColumns
): { earned: number; max: number } | null {
  let earned = 0;
  let max = 0;

  for (const a of columns.assignments) {
    const cell = assignmentCell(row, a.id);
    if (cell?.grade != null) {
      earned += cell.grade;
      max += cell.maxMarks;
    }
  }

  for (const q of columns.quizzes) {
    const cell = quizCell(row, q.id);
    if (cell?.pct != null) {
      earned += cell.pct;
      max += 100;
    }
  }

  return max > 0 ? { earned, max } : null;
}

function fmtPoints(earned: number, max: number): string {
  const format = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  return `${format(earned)}/${format(max)}`;
}

function computeClassAveragePoints(
  rows: GradebookRow[],
  columns: GradebookColumns
): { earned: number; max: number } | null {
  const perStudent = rows
    .map((row) => computeOverallPoints(row, columns))
    .filter((p): p is { earned: number; max: number } => p != null);
  if (perStudent.length === 0) return null;
  const earned =
    perStudent.reduce((sum, p) => sum + p.earned, 0) / perStudent.length;
  const max = perStudent.reduce((sum, p) => sum + p.max, 0) / perStudent.length;
  return { earned, max };
}

function assignmentCell(
  row: GradebookRow,
  id: number
): GradebookAssignmentCell | null | undefined {
  return row.assignments[id] ?? row.assignments[String(id)];
}

function quizCell(row: GradebookRow, id: number): GradebookQuizCell | null | undefined {
  return row.quizzes[id] ?? row.quizzes[String(id)];
}

function rowNeedsGrading(row: GradebookRow, columns: GradebookColumns): boolean {
  for (const a of columns.assignments) {
    const cell = assignmentCell(row, a.id);
    if (cell?.submitted && cell.grade == null) return true;
  }
  return false;
}

function toRosterStudent(row: GradebookRow): RosterStudent {
  return {
    id: row.studentId,
    full_name: row.name,
    email: row.email,
    number: row.number ?? ''
  };
}

function exportCsv(gb: Gradebook) {
  const header = [
    'Student',
    'Email',
    'ID',
    ...gb.columns.assignments.map((a) => `${a.title} (/${a.maxMarks})`),
    ...gb.columns.quizzes.map((q) => `${q.title} (%)`),
    'Overall %',
    'Overall (points)'
  ];
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.map(escape).join(',')];
  for (const row of gb.students) {
    const cells: (string | number)[] = [row.name, row.email, row.number ?? ''];
    for (const a of gb.columns.assignments) {
      const cell = assignmentCell(row, a.id);
      cells.push(cell?.grade != null ? cell.grade : '');
    }
    for (const q of gb.columns.quizzes) {
      const cell = quizCell(row, q.id);
      cells.push(cell?.pct != null ? Math.round(cell.pct) : '');
    }
    cells.push(row.overallPct != null ? Math.round(row.overallPct) : '');
    const points = computeOverallPoints(row, gb.columns);
    cells.push(points ? fmtPoints(points.earned, points.max) : '');
    lines.push(cells.map(escape).join(','));
  }
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `gradebook-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function AssignmentCell({ cell }: { cell: GradebookAssignmentCell | null | undefined }) {
  if (!cell) return <span className='text-muted-foreground'>—</span>;
  if (cell.grade != null) {
    return (
      <span className='tabular-nums'>
        {cell.grade}
        <span className='text-muted-foreground'>/{cell.maxMarks}</span>
        {cell.late ? <span className='text-muted-foreground'> · late</span> : null}
      </span>
    );
  }
  if (cell.submitted) {
    return <span className='text-muted-foreground'>To grade</span>;
  }
  return <span className='text-muted-foreground'>—</span>;
}

function OverallCell({
  row,
  columns
}: {
  row: GradebookRow;
  columns: GradebookColumns;
}) {
  const points = computeOverallPoints(row, columns);
  if (row.overallPct == null && !points) {
    return <span className='text-muted-foreground'>—</span>;
  }
  return (
    <div className='flex flex-col items-center gap-0.5 leading-tight'>
      <span>{fmtPct(row.overallPct)}</span>
      {points ? (
        <span className='text-xs font-normal text-muted-foreground tabular-nums'>
          {fmtPoints(points.earned, points.max)}
        </span>
      ) : null}
    </div>
  );
}

function QuizCell({ cell }: { cell: GradebookQuizCell | null | undefined }) {
  if (!cell || cell.pct == null) {
    return <span className='text-muted-foreground'>—</span>;
  }
  return <span className='tabular-nums'>{fmtPct(cell.pct)}</span>;
}

function GradebookTable({
  data,
  filtered,
  search,
  onRowClick
}: {
  data: Gradebook;
  filtered: GradebookRow[];
  search: string;
  onRowClick: (row: GradebookRow) => void;
}) {
  const { columns, classAverages } = data;
  const colSpan = columns.assignments.length + columns.quizzes.length + 2;

  const stickyHead =
    'sticky top-0 z-20 bg-background border-b border-border/60 text-sm font-semibold text-foreground';
  const stickyCorner = cn(stickyHead, 'left-0 z-30 text-left after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border/60');
  const stickyCell =
    'sticky left-0 z-10 bg-background after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border/40';
  const columnHead = 'min-w-[72px] border-l border-border/40 px-2 py-2.5 text-center font-semibold';

  return (
    <div className='max-h-[min(640px,calc(100dvh-16rem))] overflow-auto'>
      <table className='w-full min-w-max text-sm'>
        <thead>
          <tr className={stickyHead}>
            <th className={cn(stickyCorner, 'min-w-[200px] px-3 py-2.5')}>Student</th>
            {columns.assignments.map((a) => (
              <th
                key={`a-${a.id}`}
                className={columnHead}
                title={a.title}
              >
                <span className='line-clamp-2 text-sm leading-snug'>{a.title}</span>
                <span className='mt-0.5 block text-xs font-medium tabular-nums text-muted-foreground'>
                  /{a.maxMarks}
                </span>
              </th>
            ))}
            {columns.quizzes.map((q) => (
              <th
                key={`q-${q.id}`}
                className={columnHead}
                title={q.title}
              >
                <span className='line-clamp-2 text-sm leading-snug'>{q.title}</span>
              </th>
            ))}
            <th className={cn(columnHead, 'text-foreground')}>
              <span>Overall</span>
              <span className='mt-0.5 block text-xs font-medium text-muted-foreground'>
                % · pts
              </span>
            </th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((row) => (
            <tr
              key={row.studentId}
              role='button'
              tabIndex={0}
              onClick={() => onRowClick(row)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
              className='cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/30'
            >
              <td className={cn(stickyCell, 'px-3 py-2.5')}>
                <p className='truncate font-medium'>{row.name}</p>
                <p className='truncate text-xs text-muted-foreground'>
                  {row.number || row.email}
                </p>
              </td>
              {columns.assignments.map((a) => (
                <td
                  key={`a-${a.id}`}
                  className='border-l border-border/40 px-2 py-2.5 text-center text-sm'
                >
                  <AssignmentCell cell={assignmentCell(row, a.id)} />
                </td>
              ))}
              {columns.quizzes.map((q) => (
                <td
                  key={`q-${q.id}`}
                  className='border-l border-border/40 px-2 py-2.5 text-center text-sm'
                >
                  <QuizCell cell={quizCell(row, q.id)} />
                </td>
              ))}
              <td className='border-l border-border/40 px-2 py-2.5 text-center font-medium tabular-nums'>
                <OverallCell row={row} columns={columns} />
              </td>
            </tr>
          ))}

          {filtered.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className='px-4 py-10 text-center text-sm text-muted-foreground'>
                {search.trim() ? `No students match "${search}".` : 'No students match this filter.'}
              </td>
            </tr>
          ) : null}
        </tbody>

        <tfoot>
          <tr className='border-t border-border/60 text-xs text-muted-foreground'>
            <td className={cn(stickyCell, 'px-3 py-2.5 font-medium')}>Class average</td>
            {columns.assignments.map((a) => {
              const avg =
                classAverages.assignments[a.id] ??
                classAverages.assignments[String(a.id)] ??
                null;
              return (
                <td
                  key={`af-${a.id}`}
                  className='border-l border-border/40 px-2 py-2.5 text-center tabular-nums'
                >
                  {fmtPct(avg)}
                </td>
              );
            })}
            {columns.quizzes.map((q) => {
              const avg =
                classAverages.quizzes[q.id] ?? classAverages.quizzes[String(q.id)] ?? null;
              return (
                <td
                  key={`qf-${q.id}`}
                  className='border-l border-border/40 px-2 py-2.5 text-center tabular-nums'
                >
                  {fmtPct(avg)}
                </td>
              );
            })}
            <td className='border-l border-border/40 px-2 py-2.5 text-center font-medium tabular-nums text-foreground'>
              <div className='flex flex-col items-center gap-0.5 leading-tight'>
                <span>{fmtPct(classAverages.overall)}</span>
                {(() => {
                  const avgPoints = computeClassAveragePoints(data.students, columns);
                  return avgPoints ? (
                    <span className='text-xs font-normal text-muted-foreground tabular-nums'>
                      {fmtPoints(avgPoints.earned, avgPoints.max)}
                    </span>
                  ) : null;
                })()}
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function CourseGradebook({ courseId }: CourseGradebookProps) {
  const { data, isLoading, isError, refetch } = useGradebook(courseId);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<GradeFilter>('all');
  const [selectedStudent, setSelectedStudent] = useState<RosterStudent | null>(null);

  const needsGradingCount = useMemo(() => {
    if (!data) return 0;
    return data.students.filter((r) => rowNeedsGrading(r, data.columns)).length;
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.students;
    if (filter === 'needs_grading') {
      rows = rows.filter((r) => rowNeedsGrading(r, data.columns));
    }
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.number ?? '').toLowerCase().includes(q)
    );
  }, [data, search, filter]);

  if (isLoading) {
    return <ListSkeleton variant='row' count={8} />;
  }

  if (isError || !data) {
    return (
      <QueryErrorState
        title='Could not load grades'
        message='Try reloading the page.'
        onRetry={() => void refetch()}
      />
    );
  }

  const { columns, classAverages, studentCount } = data;
  const itemCount = columns.assignments.length + columns.quizzes.length;

  if (studentCount === 0) {
    return (
      <EmptyState
        icon={Users}
        title='No students enrolled'
        description='Grades will appear here once students join the course.'
      />
    );
  }

  if (itemCount === 0) {
    return (
      <EmptyState
        icon={AlertCircle}
        title='Nothing to grade yet'
        description='Publish an assignment or quiz to start tracking grades.'
      />
    );
  }

  const filters: { id: GradeFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: studentCount },
    { id: 'needs_grading', label: 'To grade', count: needsGradingCount }
  ];

  return (
    <div className='space-y-3'>
      <p className='text-sm text-muted-foreground'>
        {studentCount} students · {columns.assignments.length} assignments ·{' '}
        {columns.quizzes.length} quizzes · {fmtPct(classAverages.overall)} class average
        {needsGradingCount > 0 ? ` · ${needsGradingCount} to grade` : ''}
      </p>

      <div className='border border-border/60'>
        <div className='flex flex-wrap items-center gap-3 border-b border-border/60 px-3 py-2'>
          <div className='flex items-center gap-0.5'>
            {filters.map((f) => (
              <button
                key={f.id}
                type='button'
                onClick={() => setFilter(f.id)}
                className={cn(
                  'border-b px-2.5 py-1.5 text-sm transition-colors',
                  filter === f.id
                    ? 'border-foreground font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {f.label}
                {f.count > 0 ? (
                  <span className='ml-1 tabular-nums text-muted-foreground'>{f.count}</span>
                ) : null}
              </button>
            ))}
          </div>
          <div className='relative min-w-[160px] flex-1 max-w-xs'>
            <Search
              className='pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground'
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search students…'
              className='h-8 border-0 bg-transparent pl-8 shadow-none focus-visible:ring-0'
              aria-label='Search students'
            />
          </div>
          <Button
            variant='ghost'
            size='sm'
            className='ml-auto h-8 gap-1.5 text-muted-foreground'
            onClick={() => exportCsv(data)}
          >
            <Download className='size-3.5' aria-hidden />
            Export CSV
          </Button>
        </div>

        <GradebookTable
          data={data}
          filtered={filtered}
          search={search}
          onRowClick={(row) => setSelectedStudent(toRosterStudent(row))}
        />
      </div>

      <StudentProfileDrawer
        courseId={courseId}
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />
    </div>
  );
}
